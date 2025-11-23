import { RemoteAuthNetlifyAPIAgent, RemoteAuthNetlifyOAuthAgent } from "@/data/RemoteAuthAgent";
import { NetlifyClient, NetlifySite } from "@/lib/netlify/NetlifyClient";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { DeployResult, DeployRunner, DeployRunnerOptions } from "./DeployRunner";
import { NetlifyDeployData } from "./DeployTypes";

export interface NetlifyDeployRunnerOptions extends DeployRunnerOptions<NetlifyDeployData> {
  destination?: RemoteAuthNetlifyAPIAgent | RemoteAuthNetlifyOAuthAgent;
  siteId?: string;
  siteName?: string;
  createSiteIfNotExists?: boolean;
}

export class NetlifyDeployRunner extends DeployRunner<NetlifyDeployData> {
  private netlifyClient!: NetlifyClient;

  constructor(options: NetlifyDeployRunnerOptions) {
    super({
      ...options,
      destinationType: "netlify",
      destinationName: options.destinationName || "Netlify",
      data: options.data || {
        deployUrl: "",
        deploymentId: "",
        siteId: options.siteId || "",
        siteName: options.siteName || "webeditor-deploy",
        state: "new",
      },
    });
    
    if (this.destination) {
      this.netlifyClient = (this.destination as any).netlifyClient;
    }
  }

  protected getDestinationName(): string {
    return "Netlify";
  }

  protected async performDeploy(): Promise<DeployResult<NetlifyDeployData>> {
    if (!this.netlifyClient) {
      throw new Error("Netlify client not initialized - destination required");
    }

    await this.validateBuildOutput();

    try {
      const options = this.options as NetlifyDeployRunnerOptions;
      
      // Get or create site
      let site: NetlifySite;
      if (options.siteId) {
        this.log(`Using existing site: ${options.siteId}`, "info");
        site = await this.netlifyClient.getSite(options.siteId);
      } else if (options.createSiteIfNotExists) {
        this.log("Creating new site...", "info");
        site = await this.createSite(options.siteName);
      } else {
        throw new Error("Either siteId must be provided or createSiteIfNotExists must be true");
      }

      this.log(`Deploying to site: ${site.name} (${site.id})`, "info");

      // Collect files for deployment
      this.log("Collecting files for deployment...", "info");
      const files = await this.collectBuildFiles();
      this.log(`Found ${files.size} files to deploy`, "info");

      // Deploy files
      this.log("Uploading files to Netlify...", "info");
      const deployment = await this.netlifyClient.deployFiles(site.id, files);

      // Wait for deployment to complete
      this.log("Waiting for deployment to complete...", "info");
      await this.waitForDeployment(site.id, deployment.id);

      const deployUrl = deployment.ssl_url || deployment.url;
      this.log("Deployment completed successfully!", "success");

      const deployData: NetlifyDeployData = {
        deploymentId: deployment.id,
        deployUrl: deployUrl,
        siteId: site.id,
        siteName: site.name,
        adminUrl: site.admin_url,
        state: deployment.state,
        branch: deployment.branch,
      };

      return {
        success: true,
        data: deployData,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private async createSite(siteName?: string): Promise<NetlifySite> {
    const name = siteName || this.generateSiteName();
    
    this.log(`Creating site: ${name}`, "info");
    
    const site = await this.netlifyClient.createSite({
      name,
      processing_settings: {
        html: {
          pretty_urls: true,
        },
      },
    });

    this.log(`Site created: ${site.name} (${site.id})`, "success");
    return site;
  }

  private async collectBuildFiles(): Promise<Map<string, string | Blob>> {
    const files = new Map<string, string | Blob>();
    
    if (!this.buildDisk || !this.buildOutputPath) {
      throw new Error("Build disk or output path not available");
    }
    
    // Iterate through all files in the build output
    for (const node of this.buildDisk.fileTree.iterator(
      (node: TreeNode) => node.isTreeFile() && this.buildOutputPath && node.path.startsWith(this.buildOutputPath)
    )) {
      try {
        const content = await this.buildDisk.readFile(node.path);
        const relativePath = node.path.replace(this.buildOutputPath!, "").replace(/^\//, "");
        
        // Use the file path relative to build output, or default to index.html for root
        const deployPath = relativePath || "index.html";
        
        // Convert content to string or Blob
        if (content instanceof Uint8Array) {
          // Check if it's likely text content
          const textExtensions = ['.html', '.css', '.js', '.json', '.txt', '.md', '.svg', '.xml'];
          const isText = textExtensions.some(ext => deployPath.toLowerCase().endsWith(ext));
          
          if (isText) {
            files.set(deployPath, new TextDecoder().decode(content));
          } else {
            files.set(deployPath, new Blob([content as ArrayBuffer]));
          }
        } else {
          files.set(deployPath, String(content));
        }
        
        this.log(`Collected: ${deployPath}`, "info");
      } catch (error) {
        this.log(`Warning: Could not read file ${node.path}: ${error}`, "warning");
      }
    }

    return files;
  }

  private async waitForDeployment(siteId: string, deployId: string): Promise<void> {
    const maxWaitTime = 300000; // 5 minutes
    const pollInterval = 5000; // 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const deploys = await this.netlifyClient.getDeploys(siteId);
        const deployment = deploys.find(d => d.id === deployId);
        
        if (!deployment) {
          throw new Error(`Deployment ${deployId} not found`);
        }

        this.log(`Deployment status: ${deployment.state}`, "info");

        switch (deployment.state) {
          case "ready":
            this.log("Deployment is ready!", "success");
            return;
          
          case "error":
          case "failed":
            const errorMsg = deployment.error_message || "Deployment failed";
            throw new Error(`Deployment failed: ${errorMsg}`);
          
          case "building":
          case "uploading":
          case "new":
            // Continue polling
            break;
          
          default:
            this.log(`Unknown deployment state: ${deployment.state}`, "warning");
            break;
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        if (Date.now() - startTime > maxWaitTime - pollInterval) {
          throw new Error(`Deployment timed out after ${maxWaitTime / 1000} seconds`);
        }
        throw error;
      }
    }

    throw new Error(`Deployment timed out after ${maxWaitTime / 1000} seconds`);
  }

  private generateSiteName(): string {
    const buildLabel = this.build?.label || "webeditor-deploy";
    const timestamp = Date.now();
    return `${buildLabel}-${timestamp}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").substring(0, 50);
  }
}