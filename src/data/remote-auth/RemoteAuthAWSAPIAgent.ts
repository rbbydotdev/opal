import { AWSS3Bucket, AWSS3Client } from "@/api/aws/AWSClient";
import { RemoteAuthAgent } from "@/data/RemoteAuthTypes";
import { getMimeType } from "@/lib/mimeType";
import { DeployBundle } from "@/services/deploy/DeployBundle";
import type { AWSAPIRemoteAuthDAO } from "@/workspace/RemoteAuthDAO";
import { RemoteAuthAgentSearchType } from "../useFuzzySearchQuery";
import { RemoteAuthAgentDeployableFiles } from "./AgentFromRemoteAuthFactory";

export class RemoteAuthAWSAPIAgent
  implements RemoteAuthAgent, RemoteAuthAgentSearchType<AWSS3Bucket>, RemoteAuthAgentDeployableFiles<DeployBundle>
{
  private _s3Client!: AWSS3Client;
  private region: string = "us-east-1";

  get s3Client() {
    if (!this._s3Client) {
      this.initClient();
    }
    return this._s3Client;
  }
  private initClient() {
    return (this._s3Client = new AWSS3Client({
      accessKeyId: this.remoteAuth.data.apiKey,
      secretAccessKey: this.remoteAuth.data.apiSecret!,
      region: this.region,
      corsProxy: this.remoteAuth.data.corsProxy,
    }));
  }

  setRegion(region: string) {
    if (this.region === region) return this;
    this.region = region;
    this.initClient();
    return this;
  }

  getUsername(): string {
    return "aws-api";
  }

  getApiToken(): string {
    return this.remoteAuth.data.apiKey;
  }

  getSecretKey(): string {
    return this.remoteAuth.data.apiSecret || "";
  }

  async fetchAll(options?: { signal?: AbortSignal }): Promise<AWSS3Bucket[]> {
    return this.s3Client.listBuckets();
  }

  hasUpdates(
    etag: string | null,
    options?: { signal?: AbortSignal }
  ): Promise<{ updated: boolean; newEtag: string | null }> {
    // S3 doesn't support ETag for bucket lists, so we always return updated=true
    return Promise.resolve({ updated: true, newEtag: null });
  }

  createBucket = async (bucketName: string, { signal }: { signal?: AbortSignal } = {}) => {
    return this.s3Client.createBucket(bucketName);
  };

  async test(): Promise<{ status: "error"; msg: string } | { status: "success" }> {
    try {
      const isValid = await this.s3Client.verifyCredentials();
      if (isValid) {
        return { status: "success" };
      } else {
        return { status: "error", msg: "AWS credentials validation failed" };
      }
    } catch (error: any) {
      return {
        status: "error",
        msg: `AWS API test failed: ${error.message || "Unknown error"}`,
      };
    }
  }

  async deployFiles(bundle: DeployBundle, destination: any, logStatus?: (status: string) => void): Promise<unknown> {
    const bucketName = destination.meta.bucketName;
    logStatus?.("Starting deployment to S3...");

    const files = await bundle.getFiles();

    logStatus?.(`Uploading ${files.length} files to S3 bucket: ${bucketName}`);

    // Upload files in parallel
    const uploadPromises = files.map(async (file) => {
      const contentType = getMimeType(file.path);
      logStatus?.(`Uploading ${file.path}...`);
      return this.s3Client.putObject(bucketName, file.path, await file.asBuffer(), contentType);
    });

    const results = await Promise.all(uploadPromises);
    logStatus?.("All files uploaded successfully!");

    return {
      uploadedFiles: results.length,
      bucket: bucketName,
      region: this.region,
    };
  }

  async getDestinationURL(destination: any) {
    const bucketName = destination.meta.bucketName;
    // S3 static website URL format
    return `http://${bucketName}.s3-website.${this.region}.amazonaws.com`;
  }

  constructor(private remoteAuth: AWSAPIRemoteAuthDAO) {}
}
