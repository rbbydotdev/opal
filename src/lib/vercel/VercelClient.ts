import { mapToTypedError } from "@/lib/errors";

export class VercelClient {
  private accessToken: string;
  private baseUrl = "https://api.vercel.com";

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`Vercel API error: ${errorMessage}`);
      }

      return await response.json();
    } catch (e) {
      throw mapToTypedError(e);
    }
  }

  async getCurrentUser(): Promise<VercelUser> {
    return this.request<VercelUser>("/v2/user");
  }

  async getTeams(): Promise<VercelTeam[]> {
    const result = await this.request<{ teams: VercelTeam[] }>("/v2/teams");
    return result.teams;
  }

  async getProjects(teamId?: string): Promise<VercelProject[]> {
    const endpoint = teamId ? `/v9/projects?teamId=${teamId}` : "/v9/projects";
    const result = await this.request<{ projects: VercelProject[] }>(endpoint);
    return result.projects;
  }

  async getProject(projectId: string, teamId?: string): Promise<VercelProject> {
    const endpoint = teamId ? `/v9/projects/${projectId}?teamId=${teamId}` : `/v9/projects/${projectId}`;
    return this.request<VercelProject>(endpoint);
  }

  async getDeployments(projectId?: string, teamId?: string): Promise<VercelDeployment[]> {
    let endpoint = "/v6/deployments";
    const params = new URLSearchParams();
    
    if (projectId) params.append("projectId", projectId);
    if (teamId) params.append("teamId", teamId);
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    const result = await this.request<{ deployments: VercelDeployment[] }>(endpoint);
    return result.deployments;
  }

  async getDomains(teamId?: string): Promise<VercelDomain[]> {
    const endpoint = teamId ? `/v5/domains?teamId=${teamId}` : "/v5/domains";
    const result = await this.request<{ domains: VercelDomain[] }>(endpoint);
    return result.domains;
  }
}

export interface VercelUser {
  id: string;
  email: string;
  name?: string;
  username: string;
  avatar?: string;
  createdAt: number;
  defaultTeamId?: string;
}

export interface VercelTeam {
  id: string;
  slug: string;
  name: string;
  createdAt: number;
  avatar?: string;
  membership: {
    role: "OWNER" | "MEMBER" | "VIEWER";
    createdAt: number;
    updatedAt: number;
  };
}

export interface VercelProject {
  id: string;
  name: string;
  accountId: string;
  createdAt: number;
  updatedAt: number;
  framework?: string;
  devCommand?: string;
  buildCommand?: string;
  outputDirectory?: string;
  installCommand?: string;
  directoryListing: boolean;
  rootDirectory?: string;
  env?: VercelEnvironmentVariable[];
  link?: {
    type: string;
    repo: string;
    repoId: number;
    org: string;
    gitCredentialId: string;
    productionBranch: string;
  };
  targets?: {
    [key: string]: {
      domain: string;
      target: "PRODUCTION" | "STAGING";
    };
  };
}

export interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  created: number;
  source?: "cli" | "git" | "import";
  state?: "BUILDING" | "ERROR" | "INITIALIZING" | "QUEUED" | "READY" | "CANCELED";
  readyState?: "BUILDING" | "ERROR" | "INITIALIZING" | "QUEUED" | "READY" | "CANCELED";
  type: "LAMBDAS";
  creator: {
    uid: string;
    email?: string;
    username?: string;
    githubLogin?: string;
    gitlabLogin?: string;
  };
  inspectorUrl?: string;
  meta?: {
    [key: string]: string;
  };
  target?: "production" | "staging" | null;
  aliasError?: {
    code: string;
    message: string;
  };
  aliasAssigned?: number;
  builds?: VercelBuild[];
}

export interface VercelBuild {
  use: string;
  src?: string;
  dest?: string;
}

export interface VercelDomain {
  name: string;
  apexName: string;
  projectId?: string;
  redirect?: string;
  redirectStatusCode?: number;
  gitBranch?: string;
  createdAt: number;
  updatedAt: number;
  transferStartedAt?: number;
  transferCompletedAt?: number;
  verified: boolean;
  verification?: VercelDomainVerification[];
}

export interface VercelDomainVerification {
  type: string;
  domain: string;
  value: string;
  reason: string;
}

export interface VercelEnvironmentVariable {
  key: string;
  value: string;
  target?: ("production" | "preview" | "development")[];
  type?: "system" | "secret" | "plain";
}