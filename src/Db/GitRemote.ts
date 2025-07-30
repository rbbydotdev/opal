import { ClientDb } from "@/Db/instance";
import { nanoid } from "nanoid";

export type GitRemoteJType = GitRemoteRecord;

type AuthTypes = "api" | "oauth";
export interface GitRemoteRecord {
  guid: string;
  authType: AuthTypes;
}

export class GitRemoteDAO {
  guid!: string;
  authType!: AuthTypes;

  record: GitRemoteAPIRecord | GitRemoteOAuthRecord | null = null;

  save() {
    return ClientDb.gitRemotes.put({
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
    record?: GitRemoteAPIRecord | GitRemoteOAuthRecord;
  }) {
    this.guid = guid;
    this.authType = authType;
    this.record = record || null;
  }

  static guid = () => "__GitRemote__" + nanoid();
  static Create(record: GitRemoteOAuthRecord | GitRemoteAPIRecord) {
    const guid = GitRemoteDAO.guid();
    const authType = record.authType;

    const dao = new GitRemoteDAO({ guid, authType, record });
    return dao.save().then(() => dao);
  }

  async load(forceReload = false) {
    if (!forceReload && this.record) return this.record;

    const record = await ClientDb.gitRemotes.get({ guid: this.guid });
    if (!record) throw new Error(`GitRemote with guid ${this.guid} not found`);

    this.record = record;
    return this.record;
  }

  toJSON() {
    return {
      guid: this.guid,
      authType: this.authType,
    } as GitRemoteJType;
  }
  static FromJSON(json: GitRemoteJType) {
    return new GitRemoteDAO({
      guid: json.guid,
      authType: json.authType,
    });
  }
}

export interface GitRemoteOAuthRecord {
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
export interface GitRemoteAPIRecord {
  readonly authType: "api";
  // guid: string;
  apiKey: string;
  apiSecret: string;
}
