import { z } from "zod";

// 1. Add the new type to the union
export type RemoteAuthType = "api" | "oauth" | "oauth-device" | "basic-auth";
export type RemoteAuthSource = "github" | "netlify" | "cloudflare" | "private"; /*| "gitlab" | "bitbucket" | "custom";*/

// 2. Define all record schemas
export const RemoteAuthAPIRecordInternalSchema = z.object({
  apiKey: z.string(),
  apiSecret: z.string().optional(),
  corsProxy: z.string().url().nullable().optional(),
});
export type RemoteAuthAPIRecordInternal = z.infer<typeof RemoteAuthAPIRecordInternalSchema>;

export const RemoteAuthBasicAuthRecordInternalSchema = z.object({
  username: z.string(),
  password: z.string(),
  corsProxy: z.string().url().nullable().optional(),
});

export type RemoteAuthBasicAuthRecordInternal = z.infer<typeof RemoteAuthBasicAuthRecordInternalSchema>;

export const RemoteAuthOAuthRecordInternalSchema = z.object({
  accessToken: z.string(),
  tokenType: z.string(),
  expiresIn: z.number(),
  refreshToken: z.string(),
  scope: z.string(),
  obtainedAt: z.number(),
  idToken: z.string().optional(),
  corsProxy: z.string().url().nullable().optional(),
});
export type RemoteAuthOAuthRecordInternal = z.infer<typeof RemoteAuthOAuthRecordInternalSchema>;

export const RemoteAuthGithubDeviceOAuthRecordInternalSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresIn: z.number().optional(),
  login: z.string(),
  obtainedAt: z.number(),
  corsProxy: z.string().url().nullable().optional(),
});

export const RemoteAuthSchemaMap = {
  api: RemoteAuthAPIRecordInternalSchema,
  oauth: RemoteAuthOAuthRecordInternalSchema,
  "oauth-device": RemoteAuthGithubDeviceOAuthRecordInternalSchema,
  "basic-auth": RemoteAuthBasicAuthRecordInternalSchema,
} as const;

export type RemoteAuthGithubDeviceOAuthRecordInternal = z.infer<typeof RemoteAuthGithubDeviceOAuthRecordInternalSchema>;

// 3. Main record type
export interface RemoteAuthRecord {
  guid: string;
  type: RemoteAuthType;
  source: RemoteAuthSource;
  name: string;
  data:
    | RemoteAuthAPIRecordInternal
    | RemoteAuthOAuthRecordInternal
    | RemoteAuthBasicAuthRecordInternal
    | RemoteAuthGithubDeviceOAuthRecordInternal
    | null;
}
export type RemoteAuthExplicitType =
  | { type: "api"; data: RemoteAuthAPIRecordInternal }
  | { type: "oauth"; data: RemoteAuthOAuthRecordInternal }
  | { type: "oauth-device"; data: RemoteAuthGithubDeviceOAuthRecordInternal }
  | { type: "basic-auth"; data: RemoteAuthBasicAuthRecordInternal };

export type RemoteAuthJType = RemoteAuthRecord;

export type RemoteAuthDataFor<T extends RemoteAuthExplicitType["type"]> = Extract<
  RemoteAuthExplicitType,
  { type: T }
>["data"];

// 4. Type guards
export const isApiAuth = (
  record: RemoteAuthRecord
): record is RemoteAuthRecord & { data: RemoteAuthAPIRecordInternal } => {
  return record.type === "api";
};

export const isOAuthAuth = (
  record: RemoteAuthRecord
): record is RemoteAuthRecord & { data: RemoteAuthOAuthRecordInternal } => {
  return record.type === "oauth";
};

export const isGithubDeviceOAuthAuth = (
  record: RemoteAuthRecord
): record is RemoteAuthRecord & { data: RemoteAuthGithubDeviceOAuthRecordInternal } => {
  return record.type === "oauth-device";
};