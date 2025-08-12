import { ClientDb } from "@/Db/instance";
import { nanoid } from "nanoid";

// 1. Add the new type to the union
type RemoteAuthTypes = "api" | "oauth" | "github-device-oauth";

// 2. Define all record types
export type RemoteAuthAPIRecordInternal = {
  apiKey: string;
  apiSecret: string;
  apiProxy: string | null;
};

export type RemoteAuthOAuthRecordInternal = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
  scope: string;
  obtainedAt: number;
  idToken?: string;
};

export type RemoteAuthGithubDeviceOAuthRecordInternal = {
  accessToken: string;
  obtainedAt: number;
};

// 3. Main record type
export type RemoteAuthRecord<T extends RemoteAuthTypes = RemoteAuthTypes> = {
  guid: string;
  authType: T;
  tag: string;
  data: RemoteAuthAPIRecordInternal | RemoteAuthOAuthRecordInternal | RemoteAuthGithubDeviceOAuthRecordInternal | null;
};

// 4. Type guards
export const isApiAuth = (
  record: RemoteAuthRecord
): record is RemoteAuthRecord & { data: RemoteAuthAPIRecordInternal } => {
  return record.authType === "api";
};

export const isOAuthAuth = (
  record: RemoteAuthRecord
): record is RemoteAuthRecord & { data: RemoteAuthOAuthRecordInternal } => {
  return record.authType === "oauth";
};

export const isGithubDeviceOAuthAuth = (
  record: RemoteAuthRecord
): record is RemoteAuthRecord & { data: RemoteAuthGithubDeviceOAuthRecordInternal } => {
  return record.authType === "github-device-oauth";
};

// 5. DAO class
export class RemoteAuthDAO {
  guid!: string;
  authType!: RemoteAuthTypes;
  tag!: string;
  data: RemoteAuthAPIRecordInternal | RemoteAuthOAuthRecordInternal | RemoteAuthGithubDeviceOAuthRecordInternal | null =
    null;

  save() {
    return ClientDb.remoteAuths.put(
      Object.entries({
        data: this.data,
        guid: this.guid,
        authType: this.authType,
        tag: this.tag,
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
    authType,
    tag,
    data: record,
  }: {
    guid: string;
    authType: RemoteAuthTypes;
    tag: string;
    data?:
      | RemoteAuthAPIRecordInternal
      | RemoteAuthOAuthRecordInternal
      | RemoteAuthGithubDeviceOAuthRecordInternal
      | null;
  }) {
    this.guid = guid;
    this.tag = tag;
    this.authType = authType;
    this.data = record || null;
  }

  static guid = () => "__remoteauth__" + nanoid();

  static Create(authType: "api", tag: string, record: RemoteAuthAPIRecordInternal): Promise<RemoteAuthDAO>;
  static Create(authType: "oauth", tag: string, record: RemoteAuthOAuthRecordInternal): Promise<RemoteAuthDAO>;
  static Create(
    authType: "github-device-oauth",
    tag: string,
    record: RemoteAuthGithubDeviceOAuthRecordInternal
  ): Promise<RemoteAuthDAO>;
  static Create(
    authType: RemoteAuthTypes,
    tag: string,
    data: RemoteAuthOAuthRecordInternal | RemoteAuthAPIRecordInternal | RemoteAuthGithubDeviceOAuthRecordInternal
  ): Promise<RemoteAuthDAO> {
    const guid = RemoteAuthDAO.guid();
    const dao = new RemoteAuthDAO({ guid, tag, authType, data: data });
    return dao.save().then(() => dao);
  }

  toJSON() {
    return {
      tag: this.tag,
      guid: this.guid,
      authType: this.authType,
    } as RemoteAuthJType;
  }

  static FromJSON(json: RemoteAuthJType) {
    return new RemoteAuthDAO({
      tag: json.tag,
      guid: json.guid,
      authType: json.authType,
      data: json.data,
    });
  }
}

// 6. Type aliases for convenience (optional)
export type RemoteAuthOAuthRecord = RemoteAuthOAuthRecordInternal & {
  authType: "oauth";
};
export type RemoteAuthApiRecord = RemoteAuthAPIRecordInternal & {
  authType: "api";
};
export type RemoteAuthGithubDeviceOAuthRecord = RemoteAuthGithubDeviceOAuthRecordInternal & {
  authType: "github-device-oauth";
};

// 7. Main exported type
export type RemoteAuthJType = RemoteAuthRecord;
