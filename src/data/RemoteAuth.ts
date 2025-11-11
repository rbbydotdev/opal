import { ClientDb } from "@/data/instance";
import {
  RemoteAuthBasicAuthAgent,
  RemoteAuthGithubAPIAgent,
  RemoteAuthGithubDeviceOAuthAgent,
  RemoteAuthGithubOAuthAgent,
} from "@/data/RemoteAuthAgent";
import {
  RemoteAuthAPIRecordInternal,
  RemoteAuthBasicAuthRecordInternal,
  RemoteAuthDataFor,
  RemoteAuthDataUnion,
  RemoteAuthExplicitType,
  RemoteAuthGithubDeviceOAuthRecordInternal,
  RemoteAuthJType,
  RemoteAuthOAuthRecordInternal,
  RemoteAuthRecord,
  RemoteAuthSource,
  RemoteAuthType,
  TypedRemoteAuthRecord,
} from "@/data/RemoteAuthTypes";
import { nanoid } from "nanoid";

export class RemoteAuthDAO {
  guid: string;
  type: RemoteAuthType;
  source: RemoteAuthSource;
  name: string;
  tags: string[];
  data: RemoteAuthDataUnion = null;

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
    if (isGithubAPIRemoteAuthDAO(this)) {
      return new RemoteAuthGithubAPIAgent(this);
    }
    if (isGithubOAuthRemoteAuthDAO(this)) {
      return new RemoteAuthGithubOAuthAgent(this);
    }
    if (isGithubDeviceOAuthRemoteAuthDAO(this)) {
      return new RemoteAuthGithubDeviceOAuthAgent(this);
    }
    if (isBasicAuthRemoteAuthDAO(this)) {
      return new RemoteAuthBasicAuthAgent(this);
    }
    throw new Error(`No RemoteAuthGitAgent for this type: ${this.type} source: ${this.source}`);
  }
  hasRemoteApi() {
    return this.type === "api" || this.type === "oauth" || this.type === "oauth-device";
  }

  save() {
    return ClientDb.remoteAuths.put({
      data: this.data,
      guid: this.guid,
      type: this.type,
      name: this.name,
      source: this.source,
      tags: this.tags,
    });
  }

  constructor({ guid, source, type, name: name, data: record, tags }: {
    guid: string;
    source: RemoteAuthSource;
    type: RemoteAuthType;
    name: string;
    data: RemoteAuthDataUnion;
    tags: string[];
  }) {
    this.source = source;
    this.guid = guid;
    this.name = name;
    this.type = type;
    this.tags = tags;
    this.data = record || null;
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
    const dao = new RemoteAuthDAO({ guid, source, name, type, data, tags });
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

  static FromJSON(json: any) {
    return new RemoteAuthDAO({
      source: json.source,
      name: json.name,
      guid: json.guid,
      type: json.type,
      data: json.data ?? null,
      tags: json.tags,
    });
  }
}

// Use generics to create specific DAO types  
export type BasicAuthRemoteAuthDAO = RemoteAuthDAO & { type: "basic-auth"; source: "private"; data: RemoteAuthBasicAuthRecordInternal };
export function isBasicAuthRemoteAuthDAO(record: RemoteAuthDAO): record is BasicAuthRemoteAuthDAO {
  return record.type === "basic-auth" && record.source === "private";
}

export type GithubAPIRemoteAuthDAO = RemoteAuthDAO & { type: "api"; source: "github"; data: RemoteAuthAPIRecordInternal };
export function isGithubAPIRemoteAuthDAO(record: RemoteAuthDAO): record is GithubAPIRemoteAuthDAO {
  return record.type === "api" && record.source === "github";
}

export type GithubOAuthRemoteAuthDAO = RemoteAuthDAO & { type: "oauth"; source: "github"; data: RemoteAuthOAuthRecordInternal };
export function isGithubOAuthRemoteAuthDAO(record: RemoteAuthDAO): record is GithubOAuthRemoteAuthDAO {
  return record.type === "oauth" && record.source === "github";
}

export type GithubDeviceOAuthRemoteAuthDAO = RemoteAuthDAO & { type: "oauth-device"; source: "github"; data: RemoteAuthGithubDeviceOAuthRecordInternal };
export function isGithubDeviceOAuthRemoteAuthDAO(record: RemoteAuthDAO): record is GithubDeviceOAuthRemoteAuthDAO {
  return record.type === "oauth-device" && record.source === "github";
}

export type NetlifyOAuthRemoteAuthDAO = RemoteAuthDAO & { type: "oauth"; source: "netlify"; data: RemoteAuthOAuthRecordInternal };
export function isNetlifyOAuthRemoteAuthDAO(record: RemoteAuthDAO): record is NetlifyOAuthRemoteAuthDAO {
  return record.type === "oauth" && record.source === "netlify";
}

export type CloudflareAPIRemoteAuthDAO = RemoteAuthDAO & { type: "api"; source: "cloudflare"; data: RemoteAuthAPIRecordInternal };
export function isCloudflareAPIRemoteAuthDAO(record: RemoteAuthDAO): record is CloudflareAPIRemoteAuthDAO {
  return record.type === "api" && record.source === "cloudflare";
}

// Union types using generics
export type GithubRemoteAuthDAO = GithubAPIRemoteAuthDAO | GithubOAuthRemoteAuthDAO | GithubDeviceOAuthRemoteAuthDAO;
