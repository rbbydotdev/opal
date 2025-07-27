import { ClientDb } from "@/Db/instance";
import { nanoid } from "nanoid";

export type RemoteAuthJType = RemoteAuthRecord;

type AuthTypes = "api" | "oauth";
export interface RemoteAuthRecord {
  guid: string;
  authType: AuthTypes;
}

export class RemoteAuthDAO {
  guid!: string;
  authType!: AuthTypes;

  record: RemoteAuthAPIRecord | RemoteAuthOAuthRecord | null = null;

  save() {
    return ClientDb.remoteAuths.put({
      ...this.record,
      guid: this.guid,
      authType: this.authType,
    });
  }

  constructor({
    guid,
    authType,
    record,
  }: {
    guid: string;
    authType: AuthTypes;
    record?: RemoteAuthAPIRecord | RemoteAuthOAuthRecord;
  }) {
    this.guid = guid;
    this.authType = authType;
    this.record = record || null;
  }

  static guid = () => "__remoteauth__" + nanoid();
  static Create(record: RemoteAuthOAuthRecord | RemoteAuthAPIRecord) {
    const guid = RemoteAuthDAO.guid();
    const authType = record.authType;

    const dao = new RemoteAuthDAO({ guid, authType, record });
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
      guid: this.guid,
      authType: this.authType,
    } as RemoteAuthJType;
  }
  static FromJSON(json: RemoteAuthJType) {
    return new RemoteAuthDAO({
      guid: json.guid,
      authType: json.authType,
    });
  }
}

export interface RemoteAuthOAuthRecord {
  readonly authType: "oauth";
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
  scope: string;
  obtainedAt: number;
  idToken?: string;
  // guid: string;
}
export interface RemoteAuthAPIRecord {
  readonly authType: "api";
  // guid: string;
  apiKey: string;
  apiSecret: string;
}
