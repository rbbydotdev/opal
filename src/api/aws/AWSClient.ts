import { errF } from "@/lib/errors/errors";
import {
  BucketLocationConstraint,
  CreateBucketCommand,
  CreateBucketConfiguration,
  DeleteObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
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
      logger.error(errF`Error listing buckets: ${error}`);
      throw error;
    }
  }

  async putObject(
    bucketName: string,
    key: string,
    content: StreamingBlobPayloadInputTypes,
    contentType?: string
  ): Promise<AWSS3PutResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: content,
        ContentType: contentType,
      });

      const response = await this.s3Client.send(command);

      return {
        etag: response.ETag?.replace(/"/g, "") || "", // Remove quotes from etag
        location: `https://${bucketName}.s3.${this.config.region}.amazonaws.com/${key}`,
      };
    } catch (error) {
      logger.error(`Error uploading object ${key} to bucket ${bucketName}:`, error);
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
      logger.error(`Error deleting object ${key} from bucket ${bucketName}:`, error);
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
      logger.error(`Error listing objects in bucket ${bucketName}:`, error);
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
      logger.error(`Error creating bucket ${bucketName}:`, error);
      throw error;
    }
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      await this.listBuckets();
      return true;
    } catch (error) {
      logger.error("Error verifying AWS credentials:", error);
      return false;
    }
  }
}
