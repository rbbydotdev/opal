import { RemoteAuthAgentDeployable, RemoteAuthAgentSearchType } from "@/data/RemoteSearchFuzzyCache";
import { z } from "zod";

// 1. Add the new type to the union
export type RemoteAuthType = "api" | "oauth" | "oauth-device" | "basic-auth" | "no-auth";
export type RemoteAuthSource = "github" | "netlify" | "cloudflare" | "vercel" | "aws" | "custom";

// 2. Define all record schemas
const RemoteAuthAPIRecordInternalSchema = z.object({
  apiKey: z.string(),
  apiSecret: z.string().optional(),
  corsProxy: z
    .string()
    .transform((val) => ((val ?? "").trim() === "" ? undefined : val))
    .pipe(z.string().url().nullable().optional()),
});

const RemoteAuthBasicAuthRecordInternalSchema = z.object({
  username: z.string(),
  password: z.string(),
  endpoint: z.string().url(),
  corsProxy: z
    .string()
    .transform((val) => ((val ?? "").trim() === "" ? undefined : val))
    .pipe(z.string().url().nullable().optional()),
});

const RemoteAuthOAuthRecordInternalSchema = z.object({
  accessToken: z.string(),
  tokenType: z.string(),
  expiresIn: z.number(),
  refreshToken: z.string(),
  scope: z.string(),
  obtainedAt: z.number(),
  idToken: z.string().optional(),
  corsProxy: z
    .string()
    .transform((val) => ((val ?? "").trim() === "" ? undefined : val))
    .pipe(z.string().url().nullable().optional()),
});

const RemoteAuthNoAuthRecordInternalSchema = z.object({
  endpoint: z.string().url(),
  corsProxy: z
    .string()
    .transform((val) => ((val ?? "").trim() === "" ? undefined : val))
    .pipe(z.string().url().nullable().optional()),
});

const RemoteAuthDeviceOAuthRecordInternalSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresIn: z.number().optional(),
  login: z.string(),
  obtainedAt: z.number(),
  corsProxy: z
    .string()
    .optional()
    .transform((val) => ((val ?? "").trim() === "" ? undefined : val))
    .pipe(z.string().url().nullable().optional()),
});

export const RemoteAuthSchemaMap = {
  api: RemoteAuthAPIRecordInternalSchema,
  oauth: RemoteAuthOAuthRecordInternalSchema,
  "oauth-device": RemoteAuthDeviceOAuthRecordInternalSchema,
  "basic-auth": RemoteAuthBasicAuthRecordInternalSchema,
  "no-auth": RemoteAuthNoAuthRecordInternalSchema,
} as const;

// 3. Main record type - properly distributed
export type RemoteAuthRecord = {
  guid: string;
  type: RemoteAuthType;
  source: RemoteAuthSource;
  name: string;
  tags: string[];
  data: RemoteAuthDataFor<RemoteAuthType>;
  timestamp?: number;
};
export type RemoteAuthExplicitType = RemoteAuthType extends any
  ? { type: RemoteAuthType; data: RemoteAuthDataFor<RemoteAuthType> }
  : never;

// Generate specific DAO types using distributive conditional types
// Type for specific type/source combinations using distributive pattern
type TypedRemoteAuthRecord<T extends RemoteAuthType, S extends RemoteAuthSource> = T extends any
  ? S extends any
    ? {
        guid: string;
        type: T;
        source: S;
        name: string;
        tags: string[];
        data: RemoteAuthDataFor<T>;
      }
    : never
  : never;

// Use distributive conditional types to generate the union automatically
export type RemoteAuthJType = {
  guid: string;
  type: RemoteAuthType;
  source: RemoteAuthSource;
  name: string;
  tags: string[];
  data: RemoteAuthDataFor<RemoteAuthType>;
};
export type PartialRemoteAuthJType = Pick<RemoteAuthJType, "type" | "source">;
export const isRemoteAuthJType = (rad: unknown): rad is RemoteAuthJType => {
  if (!rad) return false;
  return (rad as RemoteAuthJType).name !== undefined;
};

export type RemoteAuthDataFor<T extends RemoteAuthType> = T extends keyof typeof RemoteAuthSchemaMap
  ? z.infer<(typeof RemoteAuthSchemaMap)[T]>
  : never;

// Union of all possible data types using distributive conditional type
// Helper type for creating type guards
type RemoteAuthWithType<T extends RemoteAuthType> = RemoteAuthRecord & {
  type: T;
  data: RemoteAuthDataFor<T>;
};

// Helper for creating source-specific types
// Helper for creating DAO types with specific type/source combinations
// 4. Type guards using helper types
// Interface definitions to break circular dependencies
export interface RemoteAuthAgent {
  getUsername(): string;
  getApiToken(): string;
  test(): Promise<{ status: "error"; msg: string } | { status: "success" }>;
}

export interface RemoteAuthAgentCORS {
  getCORSProxy(): string | undefined;
}

export interface RemoteAuthAgentRefreshToken {
  checkAuth(): Promise<boolean> | boolean;
  reauth(): Promise<void> | void;
}

export interface Repo {
  id: string | number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  updated_at: Date;
}

export interface RemoteGitApiAgent extends RemoteAuthAgent, RemoteAuthAgentSearchType<Repo> {
  onAuth(): { username: string; password: string };
}

export const isRemoteGitApiAgent = <T extends RemoteGitApiAgent>(agent: T | unknown | null): agent is T => {
  return !!(agent as any)?.onAuth;
};

export const isRemoteAuthDeployable = <T extends RemoteAuthAgentDeployable>(agent: T | unknown | null): agent is T => {
  return !!(agent as any)?.deploy;
};
