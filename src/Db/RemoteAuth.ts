import { ClientDb } from "@/Db/instance";
import { nanoid } from "nanoid";

export type RemoteAuthJType = RemoteAuthRecord;

type RemoteAuthTypes = "api" | "oauth";
export type RemoteAuthRecord<T extends RemoteAuthTypes = RemoteAuthTypes> = {
  guid: string;
  authType: T;
  tag: string;
  data: RemoteAuthAPIRecordInternal | RemoteAuthOAuthRecordInternal | null;
};

// export type RemoteAuthCompoundApiType = RemoteAuthAPIRecordInternal & RemoteAuthRecord<"api">;
// export type RemoteAuthCompoundOAuthType = RemoteAuthOAuthRecordInternal & RemoteAuthRecord<"oauth">;
// export type RemoteAuthCompoundType = RemoteAuthCompoundApiType | RemoteAuthCompoundOAuthType;

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

// type RemoteAuthDB

export class RemoteAuthDAO {
  guid!: string;
  authType!: RemoteAuthTypes;
  tag!: string;
  data: RemoteAuthAPIRecordInternal | RemoteAuthOAuthRecordInternal | null = null;

  save() {
    return ClientDb.remoteAuths.put(
      Object.entries({
        data: this.data,
        guid: this.guid,
        authType: this.authType,
        tag: this.tag,
      }).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          //@ts-ignore
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
    data?: RemoteAuthAPIRecordInternal | RemoteAuthOAuthRecordInternal | null;
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
    authType: RemoteAuthTypes,
    tag: string,
    data: RemoteAuthOAuthRecordInternal | RemoteAuthAPIRecordInternal
  ): Promise<RemoteAuthDAO> {
    // static Create<T extends AuthTypes>(authType: AuthTypes, tag: string, record: RemoteAuthOAuthRecord | RemoteAuthAPIRecord) {
    const guid = RemoteAuthDAO.guid();
    const dao = new RemoteAuthDAO({ guid, tag, authType, data: data });
    return dao.save().then(() => dao);
  }

  // async load(forceReload = false) {
  //   if (!forceReload && this.data) return this.data;

  //   const record = await ClientDb.remoteAuths.get({ guid: this.guid });
  //   if (!record) throw new Error(`RemoteAuth with guid ${this.guid} not found`);

  //   this.data = record;
  //   return this.data;
  // }

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

export type RemoteAuthOAuthRecord = RemoteAuthOAuthRecordInternal & { authType: "oauth" };
export type RemoteAuthApiRecord = RemoteAuthOAuthRecordInternal & { authType: "api" };
export type RemoteAuthOAuthRecordInternal = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
  scope: string;
  obtainedAt: number;
  idToken?: string;
};
export type RemoteAuthAPIRecordInternal = {
  apiKey: string;
  apiSecret: string;
  apiProxy: string | null;
};
