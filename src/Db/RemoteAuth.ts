import { ClientDb } from "@/Db/instance";
import { AuthCallback } from "isomorphic-git";
// import { RemoteAuthJTypePrivate } from "@/Db/RemoteAuth";
import { nanoid } from "nanoid";

// 1. Add the new type to the union
export type RemoteAuthType = "api" | "oauth" | "oauth-device";
export type RemoteAuthSource = "github"; /*| "gitlab" | "bitbucket" | "custom";*/

// 2. Define all record types
export type RemoteAuthAPIRecordInternal = {
  apiKey: string;
  apiSecret: string;
  corsProxy?: string | null;
};

export type RemoteAuthOAuthRecordInternal = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
  scope: string;
  obtainedAt: number;
  idToken?: string;
  corsProxy?: string | null;
};

export type RemoteAuthGithubDeviceOAuthRecordInternal = {
  accessToken: string;
  login: string;
  obtainedAt: number;
  corsProxy?: string | null;
};

// 3. Main record type
export type RemoteAuthRecord = {
  guid: string;
  type: RemoteAuthType;
  source: RemoteAuthSource;
  name: string;
  data: RemoteAuthAPIRecordInternal | RemoteAuthOAuthRecordInternal | RemoteAuthGithubDeviceOAuthRecordInternal | null;
};
export type RemoteAuthExplicitType =
  | { type: "api"; data: RemoteAuthAPIRecordInternal }
  | { type: "oauth"; data: RemoteAuthOAuthRecordInternal }
  | { type: "oauth-device"; data: RemoteAuthGithubDeviceOAuthRecordInternal };

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
export class RemoteAuthDAO {
  guid: string;
  type: RemoteAuthType;
  source: RemoteAuthSource;
  name: string;
  data: RemoteAuthAPIRecordInternal | RemoteAuthOAuthRecordInternal | RemoteAuthGithubDeviceOAuthRecordInternal | null =
    null;

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

  constructor({
    guid,
    source,
    type,
    name: name,
    data: record,
  }: {
    guid: string;
    source: RemoteAuthSource;
    type: RemoteAuthType;
    name: string;
    data?:
      | RemoteAuthAPIRecordInternal
      | RemoteAuthOAuthRecordInternal
      | RemoteAuthGithubDeviceOAuthRecordInternal
      | null;
  }) {
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

  isoGitOnAuth = (): AuthCallback | undefined => {
    try {
      if (isApiAuth(this)) {
        const { apiKey, apiSecret } = this.data;
        return () => ({
          username: apiKey,
          password: apiSecret || apiKey, //TODO i think wrong!!
        });
      } else if (isOAuthAuth(this)) {
        const { accessToken } = this.data;
        return () => ({
          username: accessToken,
          password: "", // OAuth typically only needs the token as username
        });
      }
    } catch (error) {
      console.warn(`Failed to load auth for remote ${this?.name}:`, error);
    }
    return undefined;
  };

  load() {
    throw new Error("RemoteAuthDAO.load() is deprecated, use ClientDb.remoteAuths.get(guid) instead");
    // return ClientDb.remoteAuths.get(this.guid).then((record) => {
    //   if (record) {
    //     this.data = record.data;
    //     this.name = record.name;
    //     this.type = record.type;
    //     this.source = record.source;
    //   }
    //   return this;
    // });
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

function isRemoteAuthPrivate(record: RemoteAuthDAO | RemoteAuthJType | RemoteAuthJType): record is RemoteAuthRecord {
  return (record as RemoteAuthRecord).data !== undefined;
}
function isRemoteAuthPublic(record: RemoteAuthDAO | RemoteAuthJType | RemoteAuthJType): record is RemoteAuthRecord {
  return (record as RemoteAuthRecord).data === undefined;
}
export type RemoteAuthJType = RemoteAuthRecord;

export type RemoteAuthDataFor<T extends RemoteAuthExplicitType["type"]> = Extract<
  RemoteAuthExplicitType,
  { type: T }
>["data"];
