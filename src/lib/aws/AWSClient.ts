import { S3Client, ListBucketsCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, CreateBucketCommand, CreateBucketConfiguration } from "@aws-sdk/client-s3";
import type { StreamingBlobPayloadInputTypes } from "@smithy/types";
import { ENV } from "@/lib/env";

export interface AWSS3Bucket {
  name: string;
  creationDate: Date;
}

export interface AWSS3Object {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
}

export interface AWSS3PutResult {
  etag: string;
  location?: string;
}

export class AWSS3Client {
  private s3Client: S3Client;
  private region: string;

  constructor(accessKeyId: string, secretAccessKey: string, region: string = 'us-east-1', corsProxy?: string) {
    this.region = region;
    
    // Configure S3 client with proper regional endpoint
    const clientConfig: any = {
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    };

    // If CORS proxy is provided, construct the proper proxy URL for the region
    if (corsProxy || ENV.AWS_CORS_PROXY) {
      const proxyUrl = corsProxy || ENV.AWS_CORS_PROXY;
      const s3Host = region === 'us-east-1' ? 's3.amazonaws.com' : `s3.${region}.amazonaws.com`;
      clientConfig.endpoint = `${proxyUrl}/${s3Host}`;
      clientConfig.forcePathStyle = true; // Required for custom endpoints
    }

    this.s3Client = new S3Client(clientConfig);
  }

  async listBuckets(): Promise<AWSS3Bucket[]> {
    try {
      const command = new ListBucketsCommand({});
      const response = await this.s3Client.send(command);
      
      return response.Buckets?.map(bucket => ({
        name: bucket.Name || '',
        creationDate: bucket.CreationDate || new Date(),
      })) || [];
    } catch (error) {
      console.error('Error listing buckets:', error);
      throw error;
    }
  }

  async putObject(bucketName: string, key: string, content: StreamingBlobPayloadInputTypes, contentType?: string): Promise<AWSS3PutResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: content,
        ContentType: contentType,
      });

      const response = await this.s3Client.send(command);
      
      return {
        etag: response.ETag?.replace(/"/g, '') || '', // Remove quotes from etag
        location: `https://${bucketName}.s3.${this.region}.amazonaws.com/${key}`,
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
      
      return response.Contents?.map(object => ({
        key: object.Key || '',
        size: object.Size || 0,
        lastModified: object.LastModified || new Date(),
        etag: object.ETag?.replace(/"/g, '') || '', // Remove quotes from etag
      })) || [];
    } catch (error) {
      console.error(`Error listing objects in bucket ${bucketName}:`, error);
      throw error;
    }
  }

  async createBucket(bucketName: string): Promise<AWSS3Bucket> {
    try {
      const createBucketConfig: CreateBucketConfiguration | undefined = this.region !== 'us-east-1' ? {
        LocationConstraint: this.region as any // AWS SDK types are strict about region values
      } : undefined;

      const command = new CreateBucketCommand({
        Bucket: bucketName,
        CreateBucketConfiguration: createBucketConfig
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

  async verifyCredentials(): Promise<boolean> {
    try {
      await this.listBuckets();
      return true;
    } catch (error) {
      console.error('Error verifying AWS credentials:', error);
      return false;
    }
  }
}