// import { ClientDb } from "@/data/instance";
// import { nanoid } from "nanoid";

// export type GitRemoteJType = GitRemoteRecord;

// type AuthTypes = "api" | "oauth";
// export interface GitRemoteRecord {
//   guid: string;
//   type: AuthTypes;
// }

// export class GitRemoteDAO {
//   guid!: string;
//   type!: AuthTypes;

//   record: GitRemoteAPIRecord | GitRemoteOAuthRecord | null = null;

//   save() {
//     return ClientDb.gitRemotes.put({
//       ...this.record,
//       guid: this.guid,
//       type: this.type,
//     });
//   }

//   constructor({
//     guid,
//     type,
//     record,
//   }: {
//     guid: string;
//     type: AuthTypes;
//     record?: GitRemoteAPIRecord | GitRemoteOAuthRecord;
//   }) {
//     this.guid = guid;
//     this.type = type;
//     this.record = record || null;
//   }

//   static guid = () => "__GitRemote__" + nanoid();
//   static Create(record: GitRemoteOAuthRecord | GitRemoteAPIRecord) {
//     const guid = GitRemoteDAO.guid();
//     const type = record.type;

//     const dao = new GitRemoteDAO({ guid, type, record });
//     return dao.save().then(() => dao);
//   }

//   async load(forceReload = false) {
//     if (!forceReload && this.record) return this.record;

//     const record = await ClientDb.gitRemotes.get({ guid: this.guid });
//     if (!record) throw new Error(`GitRemote with guid ${this.guid} not found`);

//     this.record = record;
//     return this.record;
//   }

//   toJSON() {
//     return {
//       guid: this.guid,
//       type: this.type,
//     } as GitRemoteJType;
//   }
//   static FromJSON(json: GitRemoteJType) {
//     return new GitRemoteDAO({
//       guid: json.guid,
//       type: json.type,
//     });
//   }
// }

// export interface GitRemoteOAuthRecord {
//   readonly type: "oauth";
//   accessToken: string;
//   tokenType: string;
//   expiresIn: number;
//   refreshToken: string;
//   scope: string;
//   obtainedAt: number;
//   idToken?: string;
//   // guid: string;
// }
// export interface GitRemoteAPIRecord {
//   readonly type: "api";
//   // guid: string;
//   apiKey: string;
//   apiSecret: string;
// }
