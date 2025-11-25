import { IRemoteAuthAgentSearch } from "@/data/RemoteSearchFuzzyCache";
import { z } from "zod";

// 1. Add the new type to the union
export type RemoteAuthType = "api" | "oauth" | "oauth-device" | "basic-auth" | "no-auth";
export type RemoteAuthSource = "github" | "netlify" | "cloudflare" | "vercel" | "aws" | "custom";

// 2. Define all record schemas
export const RemoteAuthAPIRecordInternalSchema = z.object({
  apiKey: z.string(),
  apiSecret: z.string().optional(),
  corsProxy: z
    .string()
    .transform((val) => ((val ?? "").trim() === "" ? undefined : val))
    .pipe(z.string().url().nullable().optional()),
});

export const RemoteAuthBasicAuthRecordInternalSchema = z.object({
  username: z.string(),
  password: z.string(),
  endpoint: z.string().url(),
  corsProxy: z
    .string()
    .transform((val) => ((val ?? "").trim() === "" ? undefined : val))
    .pipe(z.string().url().nullable().optional()),
});

export const RemoteAuthOAuthRecordInternalSchema = z.object({
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

export const RemoteAuthNoAuthRecordInternalSchema = z.object({
  endpoint: z.string().url(),
  corsProxy: z
    .string()
    .transform((val) => ((val ?? "").trim() === "" ? undefined : val))
    .pipe(z.string().url().nullable().optional()),
});

export const RemoteAuthGithubDeviceOAuthRecordInternalSchema = z.object({
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
  "oauth-device": RemoteAuthGithubDeviceOAuthRecordInternalSchema,
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
export type RemoteAuthDAOFor<
  T extends RemoteAuthType = RemoteAuthType,
  S extends RemoteAuthSource = RemoteAuthSource,
> = T extends any
  ? S extends any
    ? TypedRemoteAuthRecord<T, S> & {
        // Add DAO-specific methods here if needed
      }
    : never
  : never;

// Type for specific type/source combinations using distributive pattern
export type TypedRemoteAuthRecord<T extends RemoteAuthType, S extends RemoteAuthSource> = T extends any
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

export const isParitalRemoteAuthJType = (rad: unknown): rad is PartialRemoteAuthJType => {
  if (!rad) return false;
  return !(rad as RemoteAuthJType).name;
};
export const isRemoteAuthJType = (rad: unknown): rad is RemoteAuthJType => {
  if (!rad) return false;
  return (rad as RemoteAuthJType).name !== undefined;
};

export type RemoteAuthDataFor<T extends RemoteAuthType> = T extends keyof typeof RemoteAuthSchemaMap
  ? z.infer<(typeof RemoteAuthSchemaMap)[T]>
  : never;

// Union of all possible data types using distributive conditional type
export type RemoteAuthDataUnion = RemoteAuthType extends any ? RemoteAuthDataFor<RemoteAuthType> : never;

// Helper type for creating type guards
export type RemoteAuthWithType<T extends RemoteAuthType> = RemoteAuthRecord & {
  type: T;
  data: RemoteAuthDataFor<T>;
};

// Helper for creating source-specific types
export type RemoteAuthWithSource<S extends RemoteAuthSource> = RemoteAuthRecord & {
  source: S;
};

// Helper for creating DAO types with specific type/source combinations
export type RemoteAuthDAOWithTypeAndSource<T extends RemoteAuthType, S extends RemoteAuthSource> = T extends any
  ? S extends any
    ? {
        guid: string;
        type: T;
        source: S;
        name: string;
        tags: string[];
        data: RemoteAuthDataFor<T>;
        // DAO methods
        delete(): Promise<void>;
        toAgent(): any;
        hasRemoteApi(): boolean;
        save(): Promise<any>;
        toJSON(): RemoteAuthJType;
      }
    : never
  : never;

// 4. Type guards using helper types
export const isApiAuth = (record: RemoteAuthRecord): record is RemoteAuthWithType<"api"> => {
  return record.type === "api";
};

export const isOAuthAuth = (record: RemoteAuthRecord): record is RemoteAuthWithType<"oauth"> => {
  return record.type === "oauth";
};

export const isGithubDeviceOAuthAuth = (record: RemoteAuthRecord): record is RemoteAuthWithType<"oauth-device"> => {
  return record.type === "oauth-device";
};

// Interface definitions to break circular dependencies
export interface RemoteAuthAgent {
  getUsername(): string;
  getApiToken(): string;
  test(): Promise<{ status: "error"; msg: string } | { status: "success" }>;
}

export interface Repo {
  id: string | number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  updated_at: Date;
}

export interface RemoteGitApiAgent extends RemoteAuthAgent, IRemoteAuthAgentSearch<Repo> {
  onAuth(): { username: string; password: string };
}

export const isRemoteGitApiAgent = <T extends RemoteGitApiAgent>(agent: T | unknown | null): agent is T => {
  return !!(agent as any)?.onAuth;
};
