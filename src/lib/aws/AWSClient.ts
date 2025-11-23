import { S3Client, ListBucketsCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import type { StreamingBlobPayloadInputTypes } from "@smithy/types";

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

  constructor(accessKeyId: string, secretAccessKey: string, region: string = 'us-east-1') {
    this.region = region;
    this.s3Client = new S3Client({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });
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