import { errF } from "@/lib/errors/errors";
import {
  BucketLocationConstraint,
  CreateBucketCommand,
  CreateBucketConfiguration,
  DeleteObjectCommand,
  GetPublicAccessBlockCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutBucketPolicyCommand,
  PutBucketWebsiteCommand,
  PutObjectCommand,
  PutPublicAccessBlockCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { StreamingBlobPayloadInputTypes } from "@smithy/types";
import { ProxyFetchHandler } from "./ProxyFetchHandler";

export interface AWSS3Bucket {
  name: string;
  creationDate: Date;
}

interface AWSS3Object {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
}

interface AWSS3PutResult {
  etag: string;
  location?: string;
}

type AWSS3ClientConfig = {
  region: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
};

export class AWSS3Client {
  private s3Client: S3Client;
  private config: AWSS3ClientConfig;

  constructor({
    accessKeyId,
    secretAccessKey,
    region = "us-east-1",
    corsProxy,
  }: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    corsProxy?: string | null;
  }) {
    // Configure S3 client with proper regional endpoint
    this.config = {
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    };

    // Configure S3 client with custom request handler for CORS proxy
    if (corsProxy) {
      // Use custom ProxyFetchHandler instead of modifying endpoint
      // This preserves AWS signature calculation while routing through proxy
      (this.config as any).requestHandler = new ProxyFetchHandler({
        proxyUrl: corsProxy,
        requestTimeout: 30_000,
      });
    }

    this.s3Client = new S3Client(this.config);
  }

  async listBuckets(): Promise<AWSS3Bucket[]> {
    try {
      const command = new ListBucketsCommand({
        BucketRegion: this.config.region,
      });
      const response = await this.s3Client.send(command);

      return (
        response.Buckets?.map((bucket) => ({
          name: bucket.Name || "",
          creationDate: bucket.CreationDate || new Date(),
        })) || []
      );
    } catch (error) {
      console.error(errF`Error listing buckets: ${error}`);
      throw error;
    }
  }

  async putObject(
    bucketName: string,
    key: string,
    content: StreamingBlobPayloadInputTypes,
    contentType?: string,
    signal?: AbortSignal
  ): Promise<AWSS3PutResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: content,
        ContentType: contentType,
      });

      const response = await this.s3Client.send(command, { abortSignal: signal });

      return {
        etag: response.ETag?.replace(/"/g, "") || "", // Remove quotes from etag
        location: `https://${bucketName}.s3.${this.config.region}.amazonaws.com/${key}`,
      };
    } catch (error) {
      console.error(`Error uploading object ${key} to bucket ${bucketName}:`, error);
      throw error;
    }
  }

  async deleteObject(bucketName: string, key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error(`Error deleting object ${key} from bucket ${bucketName}:`, error);
      throw error;
    }
  }

  async listObjects(bucketName: string, prefix?: string): Promise<AWSS3Object[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
      });

      const response = await this.s3Client.send(command);

      return (
        response.Contents?.map((object) => ({
          key: object.Key || "",
          size: object.Size || 0,
          lastModified: object.LastModified || new Date(),
          etag: object.ETag?.replace(/"/g, "") || "", // Remove quotes from etag
        })) || []
      );
    } catch (error) {
      console.error(`Error listing objects in bucket ${bucketName}:`, error);
      throw error;
    }
  }

  async createBucket(bucketName: string): Promise<AWSS3Bucket> {
    try {
      const createBucketConfig: CreateBucketConfiguration | undefined =
        this.config.region !== "us-east-1"
          ? {
              LocationConstraint: this.config.region as BucketLocationConstraint, // AWS SDK types are strict about region values
            }
          : undefined;

      const command = new CreateBucketCommand({
        Bucket: bucketName,
        CreateBucketConfiguration: createBucketConfig,
      });

      await this.s3Client.send(command);

      return {
        name: bucketName,
        creationDate: new Date(),
      };
    } catch (error) {
      console.error(`Error creating bucket ${bucketName}:`, error);
      throw error;
    }
  }

  async configureBucketWebsite(
    bucketName: string,
    indexDocument: string = "index.html",
    errorDocument: string = "error.html"
  ): Promise<void> {
    try {
      const command = new PutBucketWebsiteCommand({
        Bucket: bucketName,
        WebsiteConfiguration: {
          IndexDocument: {
            Suffix: indexDocument,
          },
          ErrorDocument: {
            Key: errorDocument,
          },
        },
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error(`Error configuring website for bucket ${bucketName}:`, error);
      throw error;
    }
  }

  async checkBlockPublicAccess(bucketName: string): Promise<boolean> {
    try {
      const command = new GetPublicAccessBlockCommand({
        Bucket: bucketName,
      });

      const response = await this.s3Client.send(command);
      const config = response.PublicAccessBlockConfiguration;

      // Return true if any blocking is enabled that would prevent public policies
      return !!(
        config?.BlockPublicPolicy ||
        config?.IgnorePublicAcls ||
        config?.BlockPublicAcls ||
        config?.RestrictPublicBuckets
      );
    } catch (error: any) {
      if (error?.name === "NoSuchPublicAccessBlockConfiguration") {
        // No block public access configuration means it's not blocked
        return false;
      }
      console.error(`Error checking block public access for bucket ${bucketName}:`, error);
      throw error;
    }
  }

  async disableBlockPublicAccess(bucketName: string): Promise<void> {
    try {
      const command = new PutPublicAccessBlockCommand({
        Bucket: bucketName,
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: false,
          IgnorePublicAcls: false,
          BlockPublicPolicy: false,
          RestrictPublicBuckets: false,
        },
      });

      await this.s3Client.send(command);
    } catch (error: any) {
      console.error(`Error disabling block public access for bucket ${bucketName}:`, error);
      throw error;
    }
  }

  async configureBucketPublicAccess(bucketName: string): Promise<void> {
    try {
      // First, try to disable Block Public Access if it's enabled
      const isBlocked = await this.checkBlockPublicAccess(bucketName);
      if (isBlocked) {
        try {
          await this.disableBlockPublicAccess(bucketName);
        } catch (blockError: any) {
          if (blockError?.name === "AccessDenied") {
            const permissionError = new Error(
              `Cannot disable Block Public Access for bucket '${bucketName}' due to insufficient permissions.\n\n` +
                `Your AWS credentials need the following permissions:\n` +
                `- s3:PutBucketPublicAccessBlock\n` +
                `- s3:GetBucketPublicAccessBlock\n\n` +
                `To fix this manually:\n` +
                `1. Go to https://console.aws.amazon.com/s3/bucket/${bucketName}/permissions\n` +
                `2. Click "Edit" under "Block public access (bucket settings)"\n` +
                `3. Uncheck all options\n` +
                `4. Save changes and try deploying again\n\n` +
                `Alternatively, you can use CloudFront distribution for better security and performance.`
            );
            permissionError.name = "S3BlockPublicAccessError";
            throw permissionError;
          }
          throw blockError;
        }
      }

      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "PublicReadGetObject",
            Effect: "Allow",
            Principal: "*",
            Action: "s3:GetObject",
            Resource: `arn:aws:s3:::${bucketName}/*`,
          },
        ],
      };

      const command = new PutBucketPolicyCommand({
        Bucket: bucketName,
        Policy: JSON.stringify(policy),
      });

      await this.s3Client.send(command);
    } catch (error: any) {
      if (error?.name === "S3BlockPublicAccessError") {
        // Re-throw our custom error as-is
        throw error;
      }

      if (error?.name === "AccessDenied" && error?.message?.includes("BlockPublicPolicy")) {
        const blockPublicAccessError = new Error(
          `Cannot configure public access for bucket '${bucketName}' because S3 Block Public Access is enabled.\n\n` +
            `To fix this, you need to disable Block Public Access in your AWS S3 console:\n` +
            `1. Go to https://console.aws.amazon.com/s3/bucket/${bucketName}/permissions\n` +
            `2. Click "Edit" under "Block public access (bucket settings)"\n` +
            `3. Uncheck "Block public policies"\n` +
            `4. Save changes and try deploying again\n\n` +
            `Alternatively, you can use CloudFront distribution for better security and performance.`
        );
        blockPublicAccessError.name = "S3BlockPublicAccessError";
        throw blockPublicAccessError;
      }

      console.error(`Error setting public access policy for bucket ${bucketName}:`, error);
      throw error;
    }
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      await this.listBuckets();
      return true;
    } catch (error) {
      console.error("Error verifying AWS credentials:", error);
      return false;
    }
  }
}
