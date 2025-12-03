import type { AWSAPIRemoteAuthDAO } from "@/data/DAO/RemoteAuthDAO";
import { RemoteAuthAgent } from "@/data/RemoteAuthTypes";
import { RemoteAuthAgentSearchType } from "@/data/RemoteSearchFuzzyCache";
import { AWSS3Bucket, AWSS3Client } from "@/lib/aws/AWSClient";

export class RemoteAuthAWSAPIAgent implements RemoteAuthAgent, RemoteAuthAgentSearchType<AWSS3Bucket> {
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

  constructor(private remoteAuth: AWSAPIRemoteAuthDAO) {}
}
