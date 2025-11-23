import { RemoteAuthAWSAPIAgent } from "@/data/RemoteAuthAgent";
import { AWSS3Client } from "@/lib/aws/AWSClient";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { DeployResult, DeployRunner, DeployRunnerOptions } from "./DeployRunner";
import { AWSDeployData } from "./DeployTypes";
import type { StreamingBlobPayloadInputTypes } from "@smithy/types";

export interface AWSDeployRunnerOptions extends DeployRunnerOptions<AWSDeployData> {
  destination: RemoteAuthAWSAPIAgent;
  bucketName: string;
  region: string;
}

export class AWSDeployRunner extends DeployRunner<AWSDeployData> {
  private s3Client!: AWSS3Client;

  constructor(options: AWSDeployRunnerOptions) {
    super({
      ...options,
      destinationType: "aws",
      destinationName: options.destinationName || "AWS S3",
      data: options.data || {
        deployUrl: "",
        bucketName: options.bucketName || "",
        region: options.region || "us-east-1",
      },
    });

    if (this.destination) {
      this.s3Client = (this.destination as RemoteAuthAWSAPIAgent).s3Client;
    }
  }

  protected getDestinationName(): string {
    return "AWS S3";
  }

  protected async performDeploy(): Promise<DeployResult<AWSDeployData>> {
    if (!this.s3Client) {
      throw new Error("S3 client not initialized - destination required");
    }

    await this.validateBuildOutput();

    try {
      // Validate credentials first
      this.log("Validating AWS credentials...", "info");
      const isValidCredentials = await this.s3Client.verifyCredentials();
      
      if (!isValidCredentials) {
        throw new Error("AWS credentials validation failed. Please check your access key and secret key.");
      }

      const options = this.options as AWSDeployRunnerOptions;
      const bucketName = options.bucketName;
      const region = options.region;

      this.log(`Using S3 bucket: ${bucketName} in region: ${region}`, "info");

      // Collect files for deployment
      this.log("Collecting files for deployment...", "info");
      const files = await this.collectBuildFiles();
      this.log(`Found ${files.length} files to deploy`, "info");

      // Deploy files to S3
      this.log("Uploading files to S3...", "info");
      const deploymentResult = await this.deployToS3(bucketName, files);

      const deployData: AWSDeployData = {
        deployUrl: `https://${bucketName}.s3.${region}.amazonaws.com`,
        bucketName: bucketName,
        region: region,
        objectCount: files.length,
        totalSize: files.reduce((sum, file) => sum + file.content.length, 0),
        lastModified: new Date().toISOString(),
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

  private async collectBuildFiles(): Promise<{ path: string; content: Uint8Array; mimeType?: string }[]> {
    const files: { path: string; content: Uint8Array; mimeType?: string }[] = [];

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

        // Determine MIME type based on file extension
        const mimeType = this.getMimeType(relativePath);

        files.push({
          path: relativePath || "index.html", // Default to index.html for root files
          content: content instanceof Uint8Array ? content : new TextEncoder().encode(String(content)),
          mimeType,
        });

        this.log(`Collected: ${relativePath}`, "info");
      } catch (error) {
        this.log(`Warning: Could not read file ${node.path}: ${error}`, "warning");
      }
    }

    return files;
  }

  private getMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    
    const mimeTypes: Record<string, string> = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'text/javascript',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon',
      'txt': 'text/plain',
      'pdf': 'application/pdf',
      'woff': 'font/woff',
      'woff2': 'font/woff2',
      'ttf': 'font/ttf',
      'eot': 'application/vnd.ms-fontobject',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  private async deployToS3(
    bucketName: string,
    files: { path: string; content: Uint8Array; mimeType?: string }[]
  ): Promise<{ totalFiles: number; totalSize: number }> {
    let totalFiles = 0;
    let totalSize = 0;

    for (const file of files) {
      this.log(`Uploading: ${file.path}`, "info");
      
      try {
        await this.s3Client.putObject(bucketName, file.path, file.content as StreamingBlobPayloadInputTypes, file.mimeType);
        totalFiles++;
        totalSize += file.content.length;
        
        this.log(`Successfully uploaded: ${file.path} (${file.content.length} bytes)`, "info");
      } catch (error) {
        this.log(`Error uploading ${file.path}: ${error}`, "error");
        throw new Error(`Failed to upload ${file.path}: ${error}`);
      }
    }

    this.log(`Successfully uploaded ${totalFiles} files (${totalSize} bytes total)`, "success");

    return {
      totalFiles,
      totalSize,
    };
  }

  private getBucketName(): string {
    const options = this.options as AWSDeployRunnerOptions;
    return options.bucketName || 'webeditor-deploy';
  }
}