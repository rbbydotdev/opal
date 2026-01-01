import { ClientDb } from "@/data/db/DBInstance";
import {
  RemoteAuthDataFor,
  RemoteAuthExplicitType,
  RemoteAuthJType,
  RemoteAuthRecord,
  RemoteAuthSource,
  RemoteAuthType,
} from "@/data/RemoteAuthTypes";
import { getUniqueSlug } from "@/lib/getUniqueSlug";
import { toJSON } from "@/lib/toJSON";
import { nanoid } from "nanoid";

export class RemoteAuthDAO<T extends RemoteAuthType = RemoteAuthType> implements Omit<RemoteAuthRecord, "data"> {
  guid: string;
  type: RemoteAuthType;
  source: RemoteAuthSource;
  name: string;
  tags: string[];
  data: RemoteAuthDataFor<T>;
  timestamp?: number;

  /* connector: ClientDb.remoteAuths  */

  static all(): Promise<RemoteAuthDAO[]> {
    return ClientDb.remoteAuths
      .orderBy("timestamp")
      .toArray()
      .then((records) => records.reverse().map((record) => RemoteAuthDAO.FromJSON(record)));
  }

  delete() {
    return ClientDb.remoteAuths.delete(this.guid);
  }

  static deleteByGuid(guid: string) {
    return ClientDb.remoteAuths.delete(guid);
  }
  hasRemoteApi() {
    return this.type === "api" || this.type === "oauth" || this.type === "oauth-device";
  }

  save() {
    return ClientDb.remoteAuths.put({
      guid: this.guid,
      data: this.data,
      type: this.type,
      name: this.name,
      source: this.source,
      tags: this.tags,
      timestamp: this.timestamp,
    });
  }

  constructor({
    guid,
    source,
    type,
    name: name,
    data: record,
    tags,
    timestamp,
  }: {
    guid: string;
    source: RemoteAuthSource;
    type: RemoteAuthType;
    name: string;
    data: RemoteAuthDataFor<T>;
    tags: string[];
    timestamp?: number;
  }) {
    this.source = source;
    this.guid = guid;
    this.name = name;
    this.type = type;
    this.tags = tags;
    this.data = record;
    this.timestamp = timestamp;
  }

  static guid = () => "__remoteauth__" + nanoid();

  static async Create<T extends RemoteAuthExplicitType["type"]>({
    type,
    source,
    name,
    data,
    tags = [],
  }: {
    type: T;
    source: RemoteAuthSource;
    name: string;
    data: RemoteAuthDataFor<T>;
    tags: string[];
  }): Promise<RemoteAuthDAO> {
    const guid = RemoteAuthDAO.guid();

    const existingNames = (await RemoteAuthDAO.all()).map((rad) => rad.name);
    const uniq = getUniqueSlug(name, existingNames);
    const dao = new RemoteAuthDAO({ guid, source, name: uniq, type, data, tags, timestamp: Date.now() });
    return dao.save().then(() => dao);
  }

  toJSON() {
    return toJSON({
      name: this.name,
      guid: this.guid,
      type: this.type,
      source: this.source,
      tags: this.tags,
      data: this.data,
      timestamp: this.timestamp,
    }) as RemoteAuthJType;
  }

  static GetByGuid(guid: string): Promise<RemoteAuthDAO | null> {
    return ClientDb.remoteAuths.get(guid).then((record) => {
      if (record) {
        return RemoteAuthDAO.FromJSON(record);
      }
      return null;
    });
  }

  static FromJSON(json: any) {
    return new RemoteAuthDAO({
      source: json.source,
      name: json.name,
      guid: json.guid,
      type: json.type,
      data: json.data ?? null,
      tags: json.tags,
      timestamp: json.timestamp,
    });
  }
}

class NullRemoteAuthDAO extends RemoteAuthDAO {
  constructor() {
    super({
      guid: "null-remote-auth",
      source: "custom",
      type: "no-auth",
      name: "No Remote Auth",
      data: { endpoint: "", corsProxy: undefined },
      tags: [],
      timestamp: Date.now(),
    });
  }
}

export const NULL_REMOTE_AUTH = new NullRemoteAuthDAO();

// Use generics to create specific DAO types
export type BasicAuthRemoteAuthDAO = RemoteAuthDAO & {
  type: "basic-auth";
  source: "custom";
  data: RemoteAuthDataFor<"basic-auth">;
};
export function isBasicAuthRemoteAuthDAO(record: RemoteAuthDAO): record is BasicAuthRemoteAuthDAO {
  return record.type === "basic-auth" && record.source === "custom";
}

export type GithubAPIRemoteAuthDAO = RemoteAuthDAO & {
  type: "api";
  source: "github";
  data: RemoteAuthDataFor<"api">;
};
export function isGithubAPIRemoteAuthDAO(record: RemoteAuthDAO): record is GithubAPIRemoteAuthDAO {
  return record.type === "api" && record.source === "github";
}

export type GithubOAuthRemoteAuthDAO = RemoteAuthDAO & {
  type: "oauth";
  source: "github";
  data: RemoteAuthDataFor<"oauth">;
};
export function isGithubOAuthRemoteAuthDAO(record: RemoteAuthDAO): record is GithubOAuthRemoteAuthDAO {
  return record.type === "oauth" && record.source === "github";
}

export type GithubDeviceOAuthRemoteAuthDAO = RemoteAuthDAO & {
  type: "oauth-device";
  source: "github";
  data: RemoteAuthDataFor<"oauth-device">;
};
export function isGithubDeviceOAuthRemoteAuthDAO(record: RemoteAuthDAO): record is GithubDeviceOAuthRemoteAuthDAO {
  return record.type === "oauth-device" && record.source === "github";
}

export type NetlifyAPIRemoteAuthDAO = RemoteAuthDAO & {
  type: "api";
  source: "netlify";
  data: RemoteAuthDataFor<"api">;
};
export function isNetlifyAPIRemoteAuthDAO(record: RemoteAuthDAO): record is NetlifyAPIRemoteAuthDAO {
  return record.type === "api" && record.source === "netlify";
}

export type NetlifyOAuthRemoteAuthDAO = Omit<RemoteAuthDAO, "data"> & {
  type: "oauth";
  source: "netlify";
  data: RemoteAuthDataFor<"oauth">;
};
export function isNetlifyOAuthRemoteAuthDAO(record: RemoteAuthDAO): record is NetlifyOAuthRemoteAuthDAO {
  return record.type === "oauth" && record.source === "netlify";
}

export type CloudflareAPIRemoteAuthDAO = Omit<RemoteAuthDAO, "data"> & {
  type: "api";
  source: "cloudflare";
  data: RemoteAuthDataFor<"api">;
};
export function isCloudflareAPIRemoteAuthDAO(record: RemoteAuthDAO | null): record is CloudflareAPIRemoteAuthDAO {
  if (!record) return false;
  return record.type === "api" && record.source === "cloudflare";
}

export type VercelAPIRemoteAuthDAO = Omit<RemoteAuthDAO, "data"> & {
  type: "api";
  source: "vercel";
  data: RemoteAuthDataFor<"api">;
};
export function isVercelAPIRemoteAuthDAO(record: RemoteAuthDAO): record is VercelAPIRemoteAuthDAO {
  return record.type === "api" && record.source === "vercel";
}
export type VercelOAuthRemoteAuthDAO = Omit<RemoteAuthDAO, "data"> & {
  type: "oauth";
  source: "vercel";
  data: RemoteAuthDataFor<"oauth">;
};
export function isVercelOAuthRemoteAuthDAO(record: RemoteAuthDAO): record is VercelOAuthRemoteAuthDAO {
  return record.type === "oauth" && record.source === "vercel";
}

export type AWSAPIRemoteAuthDAO = Omit<RemoteAuthDAO, "data"> & {
  type: "api";
  source: "aws";
  data: RemoteAuthDataFor<"api">;
};
export function isAWSAPIRemoteAuthDAO(record: RemoteAuthDAO): record is AWSAPIRemoteAuthDAO {
  return record.type === "api" && record.source === "aws";
}

export type CustomRemoteAuthDAO = Omit<RemoteAuthDAO, "data"> & {
  type: "no-auth";
  source: "custom";
  data: RemoteAuthDataFor<"no-auth">;
};
export function isCustomRemoteAuthDAO(record: RemoteAuthDAO): record is CustomRemoteAuthDAO {
  return record.type === "no-auth" && record.source === "custom";
}

// Union types using generics
export type GithubRemoteAuthDAO = GithubAPIRemoteAuthDAO | GithubOAuthRemoteAuthDAO | GithubDeviceOAuthRemoteAuthDAO;
export type VercelRemoteAuthDAO = VercelAPIRemoteAuthDAO | VercelOAuthRemoteAuthDAO;
export type NetlifyRemoteAuthDAO = NetlifyAPIRemoteAuthDAO | NetlifyOAuthRemoteAuthDAO;
