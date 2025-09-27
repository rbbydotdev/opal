import { ClientDb } from "@/Db/instance";
import { RemoteAuthAgentForRemoteAuth } from "@/Db/RemoteAuthAgent";
// import { RemoteAuthJTypePrivate } from "@/Db/RemoteAuth";
import { nanoid } from "nanoid";
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

// type DataFor<T extends RemoteAuthExplicitType["type"]> = Extract<RemoteAuthExplicitType, { type: T }>["data"];

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

// 5. DAO class
export class RemoteAuthDAO implements RemoteAuthRecord {
  guid: string;
  type: RemoteAuthType;
  source: RemoteAuthSource;
  name: string;
  data: RemoteAuthRecord["data"] | null = null;

  /* connector: ClientDb.remoteAuths  */

  static all(): Promise<RemoteAuthDAO[]> {
    return ClientDb.remoteAuths.toArray().then((records) => records.map((record) => RemoteAuthDAO.FromJSON(record)));
  }

  delete() {
    return ClientDb.remoteAuths.delete(this.guid);
  }

  static deleteByGuid(guid: string) {
    return ClientDb.remoteAuths.delete(guid);
  }
  toAgent() {
    //for other providers we will be returning a different agent,
    //but the interface will be the same, getRepos etc
    return RemoteAuthAgentForRemoteAuth(this);
  }
  hasRemoteApi() {
    return this.type === "api" || this.type === "oauth" || this.type === "oauth-device";
  }

  save() {
    return ClientDb.remoteAuths.put(
      Object.entries({
        data: this.data,
        guid: this.guid,
        type: this.type,
        name: this.name,
        source: this.source,
      }).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          // @ts-ignore
          acc[key] = value;
        }
        return acc;
      }, {} as RemoteAuthJType)
    );
  }

  constructor({ guid, source, type, name: name, data: record }: RemoteAuthRecord) {
    this.source = source;
    this.guid = guid;
    this.name = name;
    this.type = type;
    this.data = record || null;
  }

  static guid = () => "__remoteauth__" + nanoid();

  static Create<T extends RemoteAuthExplicitType["type"]>(
    type: T,
    source: RemoteAuthSource,
    name: string,
    data: RemoteAuthDataFor<T>
  ): Promise<RemoteAuthDAO> {
    const guid = RemoteAuthDAO.guid();
    const dao = new RemoteAuthDAO({ guid, source, name, type, data });
    return dao.save().then(() => dao);
  }

  toJSON() {
    return {
      name: this.name,
      guid: this.guid,
      type: this.type,
      source: this.source,
    } as RemoteAuthJType;
  }

  static GetByGuid(guid: string): Promise<RemoteAuthDAO | null> {
    return ClientDb.remoteAuths.get(guid).then((record) => {
      if (record) {
        return RemoteAuthDAO.FromJSON(record);
      }
      return null;
    });
  }

  load() {
    throw new Error("RemoteAuthDAO.load() is deprecated, use ClientDb.remoteAuths.get(guid) instead");
  }

  static FromJSON(json: RemoteAuthJType | RemoteAuthJType) {
    return new RemoteAuthDAO({
      source: json.source,
      name: json.name,
      guid: json.guid,
      type: json.type,
      data: isRemoteAuthPrivate(json) ? json.data : null,
    });
  }
}

function isRemoteAuthPrivate(record: RemoteAuthDAO | RemoteAuthJType): record is RemoteAuthRecord {
  return (record as RemoteAuthRecord).data !== undefined;
}

export type RemoteAuthJType = RemoteAuthRecord;

export type RemoteAuthDataFor<T extends RemoteAuthExplicitType["type"]> = Extract<
  RemoteAuthExplicitType,
  { type: T }
>["data"];

export type BasicAuthRemoteAuthDAO = RemoteAuthDAO & {
  source: "private";
  type: "basic-auth";
  data: RemoteAuthBasicAuthRecordInternal;
};
export function isBasicAuthRemoteAuthDAO(record: RemoteAuthDAO): record is BasicAuthRemoteAuthDAO {
  return record.type === "basic-auth" && record.source === "private";
}

export type GithubAPIRemoteAuthDAO = RemoteAuthDAO & {
  source: "github";
  type: "api";
  data: RemoteAuthAPIRecordInternal;
};
export function isGithubAPIRemoteAuthDAO(record: RemoteAuthDAO): record is GithubAPIRemoteAuthDAO {
  return record.type === "api" && record.source === "github";
}

export type GithubOAuthRemoteAuthDAO = RemoteAuthDAO & {
  source: "github";
  type: "oauth";
  data: RemoteAuthOAuthRecordInternal;
};
export function isGithubOAuthRemoteAuthDAO(record: RemoteAuthDAO): record is GithubOAuthRemoteAuthDAO {
  return record.type === "oauth" && record.source === "github";
}
export type GithubDeviceOAuthRemoteAuthDAO = RemoteAuthDAO & {
  source: "github";
  type: "oauth-device";
  data: RemoteAuthGithubDeviceOAuthRecordInternal;
};
export function isGithubDeviceOAuthRemoteAuthDAO(record: RemoteAuthDAO): record is GithubDeviceOAuthRemoteAuthDAO {
  return record.type === "oauth-device" && record.source === "github";
}

export type NetlifyOAuthRemoteAuthDAO = RemoteAuthDAO & {
  source: "netlify";
  type: "oauth";
  data: RemoteAuthOAuthRecordInternal;
};
export function isNetlifyOAuthRemoteAuthDAO(record: RemoteAuthDAO): record is NetlifyOAuthRemoteAuthDAO {
  return record.type === "oauth" && record.source === "netlify";
}

export type CloudflareAPIRemoteAuthDAO = RemoteAuthDAO & {
  source: "cloudflare";
  type: "api";
  data: RemoteAuthAPIRecordInternal;
};
export function isCloudflareAPIRemoteAuthDAO(record: RemoteAuthDAO): record is CloudflareAPIRemoteAuthDAO {
  return record.type === "api" && record.source === "cloudflare";
}
