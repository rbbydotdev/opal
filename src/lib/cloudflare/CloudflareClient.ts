import { mapToTypedError } from "@/lib/errors";
import Cloudflare from "cloudflare";

export class CloudflareClient2 {
  private cf: Cloudflare;

  constructor({ apiToken, apiKey }: { apiToken: string; apiKey: string }) {
    this.cf = new Cloudflare({
      apiToken,
      apiKey,
    });
  }
  async fetchAllAccounts() {
    const accounts = [];
    const res = await this.cf.accounts.list();
    for await (const page of res.iterPages()) {
      accounts.push(...page.result);
    }
    return accounts;
  }
  async fetchAllProjects({ accountId }: { accountId: string }) {
    const projects = [];
    // const account_id = accountId ? accountId : (await this.cf.accounts.list()).result[0]!.id;
    const res = await this.cf.pages.projects.list({ account_id: accountId });
    for await (const page of res.iterPages()) {
      projects.push(...page.result);
    }
    return projects;
  }
  createProject({ accountId, name }: { accountId: string; name: string }) {
    return this.cf.pages.projects.create({
      account_id: accountId,
      name,
    });
  }
}
export class CloudflareClient {
  private apiToken: string;
  private baseUrl = "https://api.cloudflare.com/client/v4";

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      const data = (await response.json()) as {
        success: boolean;
        errors: { code: number; message: string }[];
        messages: string[];
        result: T;
      };

      if (!response.ok || !data.success) {
        const errors = data.errors?.map((e: any) => e.message).join(", ") || "Unknown error";
        throw new Error(`Cloudflare API error: ${response.status} ${errors}`);
      }

      return data.result;
    } catch (e) {
      throw mapToTypedError(e);
    }
  }

  async verifyToken(): Promise<CloudflareTokenInfo> {
    return this.request<CloudflareTokenInfo>("/user/tokens/verify");
  }

  async getCurrentUser(): Promise<CloudflareUser> {
    return this.request<CloudflareUser>("/user");
  }

  async getZones(): Promise<CloudflareZone[]> {
    return this.request<CloudflareZone[]>("/zones");
  }

  async getZone(zoneId: string): Promise<CloudflareZone> {
    return this.request<CloudflareZone>(`/zones/${zoneId}`);
  }

  async getDNSRecords(zoneId: string): Promise<CloudflareDNSRecord[]> {
    return this.request<CloudflareDNSRecord[]>(`/zones/${zoneId}/dns_records`);
  }

  async createDNSRecord(zoneId: string, record: CreateDNSRecordData): Promise<CloudflareDNSRecord> {
    return this.request<CloudflareDNSRecord>(`/zones/${zoneId}/dns_records`, {
      method: "POST",
      body: JSON.stringify(record),
    });
  }

  async updateDNSRecord(
    zoneId: string,
    recordId: string,
    record: Partial<CreateDNSRecordData>
  ): Promise<CloudflareDNSRecord> {
    return this.request<CloudflareDNSRecord>(`/zones/${zoneId}/dns_records/${recordId}`, {
      method: "PATCH",
      body: JSON.stringify(record),
    });
  }

  async deleteDNSRecord(zoneId: string, recordId: string): Promise<void> {
    await this.request<void>(`/zones/${zoneId}/dns_records/${recordId}`, {
      method: "DELETE",
    });
  }

  async getPages(): Promise<CloudflarePages[]> {
    return this.request<CloudflarePages[]>("/accounts/:account_id/pages/projects");
  }

  async getWorkers(): Promise<CloudflareWorker[]> {
    return this.request<CloudflareWorker[]>("/accounts/:account_id/workers/scripts");
  }

  async getR2Buckets(): Promise<CloudflareR2Bucket[]> {
    return this.request<CloudflareR2Bucket[]>("/accounts/:account_id/r2/buckets");
  }
}

export interface CloudflareTokenInfo {
  id: string;
  status: string;
  not_before: string;
  expires_on?: string;
}

export interface CloudflareUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  username: string;
  telephone?: string;
  country?: string;
  zipcode?: string;
  created_on: string;
  modified_on: string;
  api_key: string;
  two_factor_authentication: boolean;
  betas: string[];
  organizations: CloudflareOrganization[];
}

export interface CloudflareOrganization {
  id: string;
  name: string;
  status: string;
  permissions: string[];
  roles: string[];
}

export interface CloudflareZone {
  id: string;
  name: string;
  status: "active" | "pending" | "initializing" | "moved" | "deleted" | "deactivated";
  paused: boolean;
  type: "full" | "partial";
  development_mode: number;
  name_servers: string[];
  original_name_servers: string[];
  original_registrar?: string;
  original_dnshost?: string;
  modified_on: string;
  created_on: string;
  activated_on?: string;
  meta: {
    step: number;
    custom_certificate_quota: number;
    page_rule_quota: number;
    phishing_detected: boolean;
    multiple_railguns_allowed: boolean;
  };
  owner: {
    id: string;
    type: string;
    email: string;
  };
  account: {
    id: string;
    name: string;
  };
  tenant: {
    id: string;
    name: string;
  };
  tenant_unit: {
    id: string;
  };
  permissions: string[];
  plan: {
    id: string;
    name: string;
    price: number;
    currency: string;
    frequency: string;
    is_subscribed: boolean;
    can_subscribe: boolean;
    legacy_id: string;
    legacy_discount: boolean;
    externally_managed: boolean;
  };
}

export interface CloudflareDNSRecord {
  id: string;
  zone_id: string;
  zone_name: string;
  name: string;
  type: string;
  content: string;
  proxiable: boolean;
  proxied: boolean;
  ttl: number;
  locked: boolean;
  meta: {
    auto_added: boolean;
    managed_by_apps: boolean;
    managed_by_argo_tunnel: boolean;
    source: string;
  };
  comment?: string;
  tags: string[];
  created_on: string;
  modified_on: string;
}

export interface CreateDNSRecordData {
  type: string;
  name: string;
  content: string;
  ttl?: number;
  proxied?: boolean;
  comment?: string;
  tags?: string[];
}

export interface CloudflarePages {
  id: string;
  name: string;
  subdomain: string;
  domains: string[];
  source?: {
    type: string;
    config: {
      owner: string;
      repo_name: string;
      production_branch: string;
      pr_comments_enabled: boolean;
      deployments_enabled: boolean;
      production_deployments_enabled: boolean;
      preview_deployment_setting: string;
      preview_branch_includes: string[];
      preview_branch_excludes: string[];
    };
  };
  build_config: {
    build_command?: string;
    destination_dir?: string;
    root_dir?: string;
    web_analytics_tag?: string;
    web_analytics_token?: string;
  };
  created_on: string;
  production_deployment?: {
    id: string;
    short_id: string;
    project_id: string;
    project_name: string;
    environment: string;
    url: string;
    created_on: string;
    modified_on: string;
    aliases?: string[];
    latest_stage: {
      name: string;
      started_on?: string;
      ended_on?: string;
      status: string;
    };
    env_vars: Record<string, any>;
    kv_namespaces: Record<string, any>;
    durable_object_namespaces: Record<string, any>;
    compatibility_date?: string;
    compatibility_flags: string[];
    build_config: {
      build_command?: string;
      destination_dir?: string;
      root_dir?: string;
      web_analytics_tag?: string;
      web_analytics_token?: string;
    };
    source: {
      type: string;
      config: Record<string, any>;
    };
    deployment_trigger: {
      type: string;
      metadata: Record<string, any>;
    };
    stages: any[];
    build_image_major_version: number;
    usage_model?: string;
    is_skipped: boolean;
    files: Record<string, string>;
    functions_config?: Record<string, any>;
  };
  deployment_configs: {
    preview: Record<string, any>;
    production: Record<string, any>;
  };
  latest_deployment?: {
    id: string;
    short_id: string;
    project_id: string;
    project_name: string;
    environment: string;
    url: string;
    created_on: string;
    modified_on: string;
  };
  canonical_deployment: {
    id: string;
    short_id: string;
    project_id: string;
    project_name: string;
    environment: string;
    url: string;
    created_on: string;
    modified_on: string;
  };
}

export interface CloudflareWorker {
  id: string;
  etag: string;
  handlers: string[];
  modified_on: string;
  created_on: string;
  usage_model: string;
  environment_variables: Record<string, any>;
  secrets: Record<string, any>;
  compatibility_date?: string;
  compatibility_flags: string[];
  script: string;
  bindings: any[];
  logpush: boolean;
  tail_consumers?: any[];
}

export interface CloudflareR2Bucket {
  name: string;
  creation_date: string;
  location?: string;
  storage_class?: string;
}
