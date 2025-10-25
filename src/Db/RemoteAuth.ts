import { ClientDb } from "@/Db/instance";
import {
  RemoteAuthGithubAPIAgent,
  RemoteAuthGithubDeviceOAuthAgent,
  RemoteAuthGithubOAuthAgent,
} from "@/Db/RemoteAuthAgent";
import {
  RemoteAuthAPIRecordInternal,
  RemoteAuthBasicAuthRecordInternal,
  RemoteAuthDataFor,
  RemoteAuthExplicitType,
  RemoteAuthGithubDeviceOAuthRecordInternal,
  RemoteAuthJType,
  RemoteAuthOAuthRecordInternal,
  RemoteAuthRecord,
  RemoteAuthSource,
  RemoteAuthType,
} from "@/Db/RemoteAuthTypes";
import { nanoid } from "nanoid";

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
    if (isGithubAPIRemoteAuthDAO(this)) {
      return new RemoteAuthGithubAPIAgent(this);
    }
    if (isGithubOAuthRemoteAuthDAO(this)) {
      return new RemoteAuthGithubOAuthAgent(this);
    }
    if (isGithubDeviceOAuthRemoteAuthDAO(this)) {
      return new RemoteAuthGithubDeviceOAuthAgent(this);
    }
    throw new Error(`No RemoteAuthGitAgent for this type: ${this.type} source: ${this.source}`);
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

export type GithubRemoteAuthDAO = GithubAPIRemoteAuthDAO | GithubOAuthRemoteAuthDAO | GithubDeviceOAuthRemoteAuthDAO;
