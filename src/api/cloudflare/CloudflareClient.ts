import { BearerTokenAuth, createBearerTokenClient, FetchClient } from "@/api/FetchClient";
import { mapToTypedError } from "@/lib/errors/errors";
import { getMimeType } from "@/lib/mimeType";
import { optionalCORSBaseURL } from "@/lib/optionalCORSBaseURL";
import { UniversalDeployFile } from "@/services/deploy/DeployBundle";
import Cloudflare, { APIError } from "cloudflare";
import { V4PagePaginationArray } from "cloudflare/pagination.mjs";
import crypto from "crypto";
import { extname } from "path";

export interface CloudflareAccount {
  id: string;
  name: string;
  type?: string;
}

export interface CloudflareProject {
  id: string;
  name: string;
  subdomain: string;
  created_on?: string;
  production_branch?: string;
}

export interface CloudflareClientConfig {
  apiToken: string;
  baseURL?: string;
  corsProxy?: string | null;
}

export class CloudflareClient {
  private cloudflare: Cloudflare;
  private fetchClient: FetchClient;
  private corsProxy?: string;
  private apiToken: string;

  constructor(config: CloudflareClientConfig) {
    const corsProxy = config.corsProxy || undefined;
    this.corsProxy = corsProxy;
    this.apiToken = config.apiToken;

    // Use the original working approach with optionalCORSBaseURL
    const baseURL =
      optionalCORSBaseURL(corsProxy, "https://api.cloudflare.com/client/v4") || "https://api.cloudflare.com/client/v4";

    this.cloudflare = new Cloudflare({
      apiToken: config.apiToken,
      baseURL: config.baseURL || baseURL,
    });

    // Create FetchClient with the same baseURL (no additional CORS config needed)
    this.fetchClient = createBearerTokenClient(config.apiToken, config.baseURL || baseURL);
  }

  private static handleError(error: any): never {
    if (error instanceof APIError) {
      const message = error.errors.map((e) => e.message).join(", ");
      throw mapToTypedError(null, { message, code: String(error.status) });
    }
    throw mapToTypedError(error);
  }

  private static async exhaustPages<T = unknown>(res: V4PagePaginationArray<T>, signal?: AbortSignal) {
    const totalPages: number = (res.result_info as any).total_pages;
    const items = [];
    for await (const page of res.iterPages()) {
      items.push(...page.result);
      if (page.result_info.page ?? Infinity >= totalPages) break;
      if (signal?.aborted) break;
    }
    return items;
  }

  async getAccounts({ signal }: { signal?: AbortSignal } = {}): Promise<CloudflareAccount[]> {
    try {
      const response = await this.cloudflare.accounts.list({ signal });
      return await CloudflareClient.exhaustPages(response, signal);
    } catch (error) {
      throw CloudflareClient.handleError(error);
    }
  }
  async getAccountByName(
    accountName: string,
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<CloudflareAccount | null> {
    try {
      const accounts = await this.getAccounts({ signal });
      return accounts.find((acc) => acc.name === accountName) || null;
    } catch (error) {
      throw CloudflareClient.handleError(error);
    }
  }

  async getProjects(accountId: string, { signal }: { signal?: AbortSignal } = {}): Promise<CloudflareProject[]> {
    try {
      const projects: CloudflareProject[] = [];
      if (!accountId) {
        return [];
      }

      const res = await this.cloudflare.pages.projects.list({ account_id: accountId }, { signal });

      for await (const page of res.iterPages()) {
        //@ts-ignore
        projects.push(...page.result);
        if (signal?.aborted) break;
        if (!page.hasNextPage()) break;
      }
      return projects;
    } catch (error) {
      throw CloudflareClient.handleError(error);
    }
  }

  async createProject(
    accountId: string,
    { name, productionBranch = "main" }: { name: string; productionBranch?: string },
    { signal }: { signal?: AbortSignal } = {}
  ) {
    try {
      return this.cloudflare.pages.projects.create(
        {
          account_id: accountId,
          name,
          production_branch: productionBranch,
        },
        { signal }
      );
    } catch (error) {
      throw CloudflareClient.handleError(error);
    }
  }

  async deployToPages(
    accountId: string,
    projectName: string,
    files: UniversalDeployFile[],
    options: { logStatus?: (status: string) => void } = {}
  ): Promise<any> {
    const logStatus = options?.logStatus || (() => {});

    try {
      // Step 1: Get upload JWT token
      logStatus("Getting upload token...");
      const uploadTokenEndpoint = `/accounts/${accountId}/pages/projects/${projectName}/upload-token`;

      const tokenResponse = await this.fetchClient.json<{ result: { jwt: string } }>(uploadTokenEndpoint, {
        method: "GET",
      });
      const { jwt } = tokenResponse.result;

      // Create a new fetch client with the JWT for asset uploads, using CORS proxy if configured
      const assetBaseURL =
        optionalCORSBaseURL(this.corsProxy, "https://api.cloudflare.com/client/v4") ||
        "https://api.cloudflare.com/client/v4";
      const assetClient = createBearerTokenClient(jwt, assetBaseURL);

      // Step 2: Prepare files with hashes
      logStatus(`Processing ${files.length} files...`);
      const fileData = await Promise.all(
        files.map(async (file) => {
          const content = await file.asBase64();
          const extension = extname(file.path).substring(1); // Remove the leading dot
          // Follow Wrangler's approach: hash(base64Contents + extension) and truncate to 32 chars
          const hashInput = content + extension;
          const hash = crypto.createHash("sha1").update(hashInput).digest("hex").slice(0, 32);
          const contentType = getMimeType(file.path) || "application/octet-stream";

          return {
            file,
            hash,
            content,
            contentType,
          };
        })
      );

      // Step 3: Check which files are missing (for caching)
      logStatus("Checking for cached files...");
      const hashes = fileData.map((f) => f.hash);
      const missingHashesResponse = await assetClient.json<{ result: string[] }>("/pages/assets/check-missing", {
        method: "POST",
        body: JSON.stringify({ hashes }),
      });
      const missingHashes = missingHashesResponse.result;

      const filesToUpload = fileData.filter((f) => missingHashes.includes(f.hash));
      const cachedCount = fileData.length - filesToUpload.length;
      if (cachedCount > 0) {
        logStatus(`Using ${cachedCount} cached files, uploading ${filesToUpload.length} new files...`);
      } else {
        logStatus(`Uploading ${filesToUpload.length} files...`);
      }

      // Step 4: Upload files in buckets (max 50MB per request, max 5000 files per request)
      const MAX_BUCKET_SIZE = 50 * 1024 * 1024; // 50MB
      const MAX_FILES_PER_BUCKET = 5000;

      // Sort files by size (largest first) for better bucket packing
      const sortedFiles = [...filesToUpload].sort((a, b) => b.content.length - a.content.length);

      // Create buckets
      const buckets: (typeof sortedFiles)[] = [];
      let currentBucket: typeof sortedFiles = [];
      let currentBucketSize = 0;

      for (const fileData of sortedFiles) {
        const fileSize = fileData.content.length;

        // If this file would exceed bucket limits, start a new bucket
        if (currentBucket.length >= MAX_FILES_PER_BUCKET || currentBucketSize + fileSize > MAX_BUCKET_SIZE) {
          if (currentBucket.length > 0) {
            buckets.push(currentBucket);
            currentBucket = [];
            currentBucketSize = 0;
          }
        }

        currentBucket.push(fileData);
        currentBucketSize += fileSize;
      }

      // Don't forget the last bucket
      if (currentBucket.length > 0) {
        buckets.push(currentBucket);
      }

      // Upload each bucket
      let uploadedCount = 0;
      for (let i = 0; i < buckets.length; i++) {
        const bucket = buckets[i];
        if (!bucket) continue;

        logStatus(`Uploading bucket ${i + 1}/${buckets.length} (${bucket.length} files)...`);

        const payload = bucket.map(({ hash, content, contentType }) => ({
          key: hash,
          value: content,
          metadata: { contentType },
          base64: true,
        }));

        await assetClient.json("/pages/assets/upload", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        uploadedCount += bucket.length;
        logStatus(`Uploaded ${uploadedCount}/${filesToUpload.length} files...`);
      }

      // Step 5: Upsert hashes to confirm upload
      logStatus("Confirming file uploads...");
      await assetClient.json("/pages/assets/upsert-hashes", {
        method: "POST",
        body: JSON.stringify({ hashes }),
      });

      // Step 6: Create deployment with manifest
      logStatus("Creating deployment...");
      const manifest = Object.fromEntries(fileData.map(({ file, hash }) => [`/${file.path}`, hash]));

      const formData = new FormData();
      formData.append("manifest", JSON.stringify(manifest));

      // Create a separate client for FormData that doesn't set Content-Type header
      const deploymentBaseURL =
        optionalCORSBaseURL(this.corsProxy, "https://api.cloudflare.com/client/v4") ||
        "https://api.cloudflare.com/client/v4";

      const formDataClient = new FetchClient(
        new BearerTokenAuth(this.apiToken),
        deploymentBaseURL,
        {} // No default headers - let browser set Content-Type for FormData
      );

      const response = await formDataClient.fetch(`/accounts/${accountId}/pages/projects/${projectName}/deployments`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const deployment = (await response.json()) as {
        result: {
          id: string;
          url: string;
          latest_stage: { name: string; status: string } | null;
        };
      };
      const deploymentResult = deployment.result || deployment;

      logStatus("Deployment created, waiting for completion...");

      // Poll deployment status until complete (following Wrangler's approach)
      const MAX_DEPLOYMENT_STATUS_ATTEMPTS = 5;
      let attempts = 0;
      let latestDeploymentStage = deploymentResult.latest_stage;

      while (
        attempts < MAX_DEPLOYMENT_STATUS_ATTEMPTS &&
        latestDeploymentStage?.name !== "deploy" &&
        latestDeploymentStage?.status !== "success" &&
        latestDeploymentStage?.status !== "failure"
      ) {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        const delay = Math.pow(2, attempts++) * 1000;
        logStatus(`Checking deployment status (attempt ${attempts}/${MAX_DEPLOYMENT_STATUS_ATTEMPTS})...`);

        await new Promise((resolve) => setTimeout(resolve, delay));

        try {
          const statusResponse = await this.fetchClient.json<{ result: any }>(
            `/accounts/${accountId}/pages/projects/${projectName}/deployments/${deploymentResult.id}`
          );
          const statusResult = statusResponse.result || statusResponse;
          latestDeploymentStage = statusResult.latest_stage;
        } catch (error) {
          console.warn("Failed to check deployment status:", error);
          break;
        }
      }

      // Check final status
      if (latestDeploymentStage?.name === "deploy" && latestDeploymentStage?.status === "success") {
        logStatus("Deployment completed successfully!");
      } else if (latestDeploymentStage?.status === "failure") {
        logStatus("Deployment failed - check Cloudflare dashboard for details");
        throw new Error(`Deployment failed in stage: ${latestDeploymentStage?.name}`);
      } else {
        logStatus("Deployment status unknown - check Cloudflare dashboard for details");
      }

      return deployment;
    } catch (error) {
      logStatus(`Deployment failed: ${error}`);
      throw CloudflareClient.handleError(error);
    }
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      await this.getAccounts();
      return true;
    } catch (error) {
      console.error("Error verifying Cloudflare credentials:", error);
      return false;
    }
  }
}
