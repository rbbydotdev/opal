// Base deploy data interface
export interface BaseDeployData {
  deployUrl?: string;
}

// Provider-specific deploy data interfaces
export interface CloudflareDeployData extends BaseDeployData {
  deploymentId: string;
  deployUrl: string;
  projectName: string;
  accountId: string;
  environment?: "production" | "preview";
}

export interface NetlifyDeployData extends BaseDeployData {
  deploymentId: string;
  deployUrl: string;
  siteId: string;
  siteName: string;
  adminUrl?: string;
  state?: "new" | "building" | "uploading" | "uploaded" | "ready" | "error" | "failed";
  branch?: string;
}

export interface GitHubPagesDeployData extends BaseDeployData {
  deployUrl: string;
  owner: string;
  repo: string;
  branch: string;
  commitSha?: string;
  commitUrl?: string;
  pagesEnabled: boolean;
}

export interface VercelDeployData extends BaseDeployData {
  deploymentId: string;
  deployUrl: string;
  projectId?: string;
  projectName: string;
  teamId?: string;
  environment?: "production" | "preview" | "development";
  alias?: string[];
}

// Union type for all deploy data types
export type DeployData = 
  | CloudflareDeployData 
  | NetlifyDeployData 
  | GitHubPagesDeployData 
  | VercelDeployData
  | BaseDeployData; // fallback for unknown types

// Type mapping for deploy types to data
export interface DeployDataMap {
  cloudflare: CloudflareDeployData;
  netlify: NetlifyDeployData;
  github: GitHubPagesDeployData;
  vercel: VercelDeployData;
}

// Helper type to get data type for a specific deploy type
export type DeployDataFor<T extends keyof DeployDataMap> = DeployDataMap[T];