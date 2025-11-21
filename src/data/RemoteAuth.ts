import { ClientDb } from "@/data/instance";
import {
  RemoteAuthDataFor,
  RemoteAuthExplicitType,
  RemoteAuthJType,
  RemoteAuthRecord,
  RemoteAuthSource,
  RemoteAuthType,
} from "@/data/RemoteAuthTypes";
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
      .then((records) => records.map((record) => RemoteAuthDAO.FromJSON(record)));
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
    }); // this.guid
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

  static Create<T extends RemoteAuthExplicitType["type"]>(
    type: T,
    source: RemoteAuthSource,
    name: string,
    data: RemoteAuthDataFor<T>,
    tags: string[] = []
  ): Promise<RemoteAuthDAO> {
    const guid = RemoteAuthDAO.guid();
    const dao = new RemoteAuthDAO({ guid, source, name, type, data, tags, timestamp: Date.now() });
    return dao.save().then(() => dao);
  }

  toJSON() {
    return {
      name: this.name,
      guid: this.guid,
      type: this.type,
      source: this.source,
      tags: this.tags,
      data: this.data,
      timestamp: this.timestamp,
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

export type NoAuthRemoteAuthDAO = RemoteAuthDAO & {
  type: "no-auth";
  source: "custom";
  data: RemoteAuthDataFor<"no-auth">;
};

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

export type NetlifyOAuthRemoteAuthDAO = RemoteAuthDAO & {
  type: "oauth";
  source: "netlify";
  data: RemoteAuthDataFor<"oauth">;
};
export function isNetlifyOAuthRemoteAuthDAO(record: RemoteAuthDAO): record is NetlifyOAuthRemoteAuthDAO {
  return record.type === "oauth" && record.source === "netlify";
}

export type CloudflareAPIRemoteAuthDAO = RemoteAuthDAO & {
  type: "api";
  source: "cloudflare";
  data: RemoteAuthDataFor<"api">;
};
export function isCloudflareAPIRemoteAuthDAO(record: RemoteAuthDAO): record is CloudflareAPIRemoteAuthDAO {
  return record.type === "api" && record.source === "cloudflare";
}

// Union types using generics
export type GithubRemoteAuthDAO = GithubAPIRemoteAuthDAO | GithubOAuthRemoteAuthDAO | GithubDeviceOAuthRemoteAuthDAO;
export type NetlifyRemoteAuthDAO = NetlifyAPIRemoteAuthDAO | NetlifyOAuthRemoteAuthDAO;
