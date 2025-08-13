import { ClientDb } from "@/Db/instance";
import { nanoid } from "nanoid";

// 1. Add the new type to the union
export type RemoteAuthType = "api" | "oauth" | "oauth-device";
export type RemoteAuthSource = "github"; /*| "gitlab" | "bitbucket" | "custom";*/

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
  login: string;
  obtainedAt: number;
};

// 3. Main record type
export type RemoteAuthRecord = {
  guid: string;
  type: RemoteAuthType;
  source: RemoteAuthSource;
  name: string;
  data: RemoteAuthAPIRecordInternal | RemoteAuthOAuthRecordInternal | RemoteAuthGithubDeviceOAuthRecordInternal | null;
};

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
  guid!: string;
  type!: RemoteAuthType;
  source!: RemoteAuthSource;
  name!: string;
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
      }).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          // @ts-ignore
          acc[key] = value;
        }
        return acc;
      }, {} as RemoteAuthJTypePrivte)
    );
  }

  constructor({
    guid,
    type,
    name: name,
    data: record,
  }: {
    guid: string;
    type: RemoteAuthType;
    name: string;
    data?:
      | RemoteAuthAPIRecordInternal
      | RemoteAuthOAuthRecordInternal
      | RemoteAuthGithubDeviceOAuthRecordInternal
      | null;
  }) {
    this.guid = guid;
    this.name = name;
    this.type = type;
    this.data = record || null;
  }

  static guid = () => "__remoteauth__" + nanoid();

  static Create(type: "api", name: string, record: RemoteAuthAPIRecordInternal): Promise<RemoteAuthDAO>;
  static Create(type: "oauth", name: string, record: RemoteAuthOAuthRecordInternal): Promise<RemoteAuthDAO>;
  static Create(
    type: "oauth-device",
    name: string,
    record: RemoteAuthGithubDeviceOAuthRecordInternal
  ): Promise<RemoteAuthDAO>;
  static Create(
    type: RemoteAuthType,
    name: string,
    data: RemoteAuthOAuthRecordInternal | RemoteAuthAPIRecordInternal | RemoteAuthGithubDeviceOAuthRecordInternal
  ): Promise<RemoteAuthDAO> {
    const guid = RemoteAuthDAO.guid();
    const dao = new RemoteAuthDAO({ guid, name: name, type, data: data });
    return dao.save().then(() => dao);
  }

  toJSON() {
    return {
      name: this.name,
      guid: this.guid,
      type: this.type,
    } as RemoteAuthJTypePrivte;
  }

  static FromJSON(json: RemoteAuthJTypePrivte) {
    return new RemoteAuthDAO({
      name: json.name,
      guid: json.guid,
      type: json.type,
      data: json.data,
    });
  }
}

// 6. Type aliases for convenience (optional)
export type RemoteAuthOAuthRecord = RemoteAuthOAuthRecordInternal & {
  type: "oauth";
};
export type RemoteAuthApiRecord = RemoteAuthAPIRecordInternal & {
  type: "api";
};
export type RemoteAuthGithubDeviceOAuthRecord = RemoteAuthGithubDeviceOAuthRecordInternal & {
  type: "oauth-device";
};

// 7. Main exported type
export type RemoteAuthJTypePrivte = RemoteAuthRecord;
export type RemoteAuthJTypePublic = Omit<RemoteAuthRecord, "data">;
