import { mapToTypedError } from "@/lib/errors";

export class NetlifyClient {
  private accessToken: string;
  private baseUrl = "https://api.netlify.com/api/v1";

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
        throw new Error(`Netlify API error: ${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<T>;
    } catch (e) {
      throw mapToTypedError(e);
    }
  }

  async getCurrentUser(): Promise<NetlifyUser> {
    return this.request<NetlifyUser>("/user");
  }

  async getSites(): Promise<NetlifySite[]> {
    return this.request<NetlifySite[]>("/sites");
  }

  async getSite(siteId: string): Promise<NetlifySite> {
    return this.request<NetlifySite>(`/sites/${siteId}`);
  }

  async getDeploys(siteId: string): Promise<NetlifyDeploy[]> {
    return this.request<NetlifyDeploy[]>(`/sites/${siteId}/deploys`);
  }

  async createSite(data: CreateSiteData): Promise<NetlifySite> {
    return this.request<NetlifySite>("/sites", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateSite(siteId: string, data: Partial<CreateSiteData>): Promise<NetlifySite> {
    return this.request<NetlifySite>(`/sites/${siteId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteSite(siteId: string): Promise<void> {
    await this.request<void>(`/sites/${siteId}`, {
      method: "DELETE",
    });
  }

  async deployFiles(siteId: string, files: Map<string, string | Blob>): Promise<NetlifyDeploy> {
    const formData = new FormData();

    files.forEach((content, path) => {
      if (typeof content === "string") {
        formData.append(path, new Blob([content], { type: "text/plain" }), path);
      } else {
        formData.append(path, content, path);
      }
    });

    const response = await fetch(`${this.baseUrl}/sites/${siteId}/deploys`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Deploy failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<NetlifyDeploy>;
  }
}

export interface NetlifyUser {
  id: string;
  uid: string;
  full_name: string;
  avatar_url: string;
  email: string;
  affiliate_id?: string;
  site_count: number;
  created_at: string;
  last_login: string;
  login_providers: string[];
  onboarding_progress: {
    slides: string;
  };
}

export interface NetlifySite {
  id: string;
  site_id: string;
  plan: string;
  ssl_plan: string;
  premium: boolean;
  claimed: boolean;
  name: string;
  custom_domain?: string;
  domain_aliases: string[];
  password?: string;
  notification_email?: string;
  url: string;
  ssl_url: string;
  admin_url: string;
  screenshot_url?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  session_id?: string;
  ssl: boolean;
  force_ssl: boolean;
  managed_dns: boolean;
  deploy_url: string;
  published_deploy?: {
    id: string;
    site_id: string;
    user_id: string;
    build_id: string;
    state: string;
    name: string;
    url: string;
    ssl_url: string;
    admin_url: string;
    deploy_url: string;
    deploy_ssl_url: string;
    screenshot_url?: string;
    review_id?: number;
    draft: boolean;
    required: string[];
    required_functions: string[];
    error_message?: string;
    branch: string;
    commit_ref?: string;
    commit_url?: string;
    skipped?: boolean;
    created_at: string;
    updated_at: string;
    published_at?: string;
    title?: string;
    context: string;
    locked?: boolean;
    review_url?: string;
    framework?: string;
    function_schedules: any[];
  };
  account_name: string;
  account_slug: string;
  git_provider?: string;
  deploy_hook?: string;
  capabilities: Record<string, any>;
  processing_settings: {
    html: {
      pretty_urls: boolean;
    };
  };
  build_settings: {
    id: number;
    provider: string;
    deploy_key_id: string;
    repo_path: string;
    repo_branch: string;
    dir: string;
    functions_dir: string;
    cmd: string;
    allowed_branches: string[];
    public_repo: boolean;
    private_logs: boolean;
    repo_url: string;
    env: Record<string, any>;
    installation_id: number;
    stop_builds: boolean;
  };
  id_domain: string;
  default_hooks_data: {
    access_token: string;
  };
  build_image: string;
}

export interface NetlifyDeploy {
  id: string;
  site_id: string;
  user_id: string;
  build_id: string;
  state: "new" | "building" | "uploading" | "uploaded" | "ready" | "error" | "failed";
  name: string;
  url: string;
  ssl_url: string;
  admin_url: string;
  deploy_url: string;
  deploy_ssl_url: string;
  screenshot_url?: string;
  review_id?: number;
  draft: boolean;
  required: string[];
  required_functions: string[];
  error_message?: string;
  branch: string;
  commit_ref?: string;
  commit_url?: string;
  skipped?: boolean;
  created_at: string;
  updated_at: string;
  published_at?: string;
  title?: string;
  context: string;
  locked?: boolean;
  review_url?: string;
  framework?: string;
  function_schedules: any[];
}

export interface CreateSiteData {
  name?: string;
  custom_domain?: string;
  password?: string;
  notification_email?: string;
  build_settings?: {
    provider?: string;
    repo_path?: string;
    repo_branch?: string;
    dir?: string;
    functions_dir?: string;
    cmd?: string;
    env?: Record<string, string>;
    public_repo?: boolean;
    private_logs?: boolean;
    repo_url?: string;
    allowed_branches?: string[];
    stop_builds?: boolean;
  };
  repo?: {
    provider?: string;
    repo_path?: string;
    repo_branch?: string;
    repo_url?: string;
    dir?: string;
    functions_dir?: string;
    cmd?: string;
    env?: Record<string, string>;
    public_repo?: boolean;
    private_logs?: boolean;
    allowed_branches?: string[];
    stop_builds?: boolean;
  };
  processing_settings?: {
    html?: {
      pretty_urls?: boolean;
    };
  };
}
