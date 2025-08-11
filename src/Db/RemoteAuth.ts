import { ClientDb } from "@/Db/instance";
import { nanoid } from "nanoid";

export type RemoteAuthJType = RemoteAuthRecord;

type RemoteAuthTypes = "api" | "oauth";
export type RemoteAuthRecord<T extends RemoteAuthTypes = RemoteAuthTypes> = {
  guid: string;
  authType: T;
  tag: string;
};

export type RemoteAuthCompoundApiType = RemoteAuthAPIRecordInternal & RemoteAuthRecord<"api">;
export type RemoteAuthCompoundOAuthType = RemoteAuthOAuthRecordInternal & RemoteAuthRecord<"oauth">;
export type RemoteAuthCompoundType = RemoteAuthCompoundApiType | RemoteAuthCompoundOAuthType;

export const isApiAuth = (record: RemoteAuthCompoundType): record is RemoteAuthCompoundApiType => {
  return record.authType === "api";
};
export const isOAuthAuth = (record: RemoteAuthCompoundType): record is RemoteAuthCompoundOAuthType => {
  return record.authType === "oauth";
};

export class RemoteAuthDAO {
  guid!: string;
  authType!: RemoteAuthTypes;
  tag!: string;

  record: RemoteAuthAPIRecordInternal | RemoteAuthOAuthRecordInternal | null = null;

  save() {
    return ClientDb.remoteAuths.put({
      ...this.record,
      guid: this.guid,
      authType: this.authType,
      tag: this.tag,
    });
  }

  constructor({
    guid,
    authType,
    tag,
    record,
  }: {
    guid: string;
    authType: RemoteAuthTypes;
    tag: string;
    record?: RemoteAuthAPIRecordInternal | RemoteAuthOAuthRecordInternal;
  }) {
    this.guid = guid;
    this.tag = tag;
    this.authType = authType;
    this.record = record || null;
  }

  static guid = () => "__remoteauth__" + nanoid();

  static Create(authType: "api", tag: string, record: RemoteAuthAPIRecordInternal): Promise<RemoteAuthDAO>;
  static Create(authType: "oauth", tag: string, record: RemoteAuthOAuthRecordInternal): Promise<RemoteAuthDAO>;
  static Create(
    authType: RemoteAuthTypes,
    tag: string,
    record: RemoteAuthOAuthRecordInternal | RemoteAuthAPIRecordInternal
  ): Promise<RemoteAuthDAO> {
    // static Create<T extends AuthTypes>(authType: AuthTypes, tag: string, record: RemoteAuthOAuthRecord | RemoteAuthAPIRecord) {
    const guid = RemoteAuthDAO.guid();
    const dao = new RemoteAuthDAO({ guid, tag, authType, record });
    return dao.save().then(() => dao);
  }

  async load(forceReload = false) {
    if (!forceReload && this.record) return this.record;

    const record = await ClientDb.remoteAuths.get({ guid: this.guid });
    if (!record) throw new Error(`RemoteAuth with guid ${this.guid} not found`);

    this.record = record;
    return this.record;
  }

  toJSON() {
    return {
      tag: this.tag,
      guid: this.guid,
      authType: this.authType,
    } as RemoteAuthJType;
  }
  static FromJSON(json: RemoteAuthJType, record?: RemoteAuthAPIRecordInternal | RemoteAuthOAuthRecordInternal) {
    return new RemoteAuthDAO({
      tag: json.tag,
      guid: json.guid,
      authType: json.authType,
      record,
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
};
