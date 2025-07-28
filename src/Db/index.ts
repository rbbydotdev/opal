import { HistoryDocRecord } from "@/Db/HistoryDAO";
import { RemoteAuthAPIRecord, RemoteAuthOAuthRecord, RemoteAuthRecord } from "@/Db/RemoteAuth";
import { SettingsRecord } from "@/Db/SettingsRecord";
import { default as Dexie, type EntityTable } from "dexie";
import { applyEncryptionMiddleware, clearAllTables, cryptoOptions } from "dexie-encrypted";
import { DiskRecord } from "./DiskRecord";
import { WorkspaceRecord } from "./WorkspaceRecord";

export class ClientIndexedDb extends Dexie {
  workspaces!: EntityTable<WorkspaceRecord, "guid">;
  remoteAuths!: EntityTable<(RemoteAuthOAuthRecord | RemoteAuthAPIRecord) & RemoteAuthRecord, "guid">;
  settings!: EntityTable<SettingsRecord, "name">;
  disks!: EntityTable<DiskRecord, "guid">;

  historyDocs!: EntityTable<HistoryDocRecord, "edit_id">; // Auto-increment edit_id

  constructor() {
    super("ClientIndexedDb");

    this.version(1).stores({
      settings: "name",
      remoteAuths: "guid,authType,ta",
      workspaces: "guid,name",
      disks: "guid",
      thumbnails: "[workspaceId+path],guid,path,workspaceId",
      historyDocs: "++edit_id,id,parent,workspaceId",
    });

    // this.remoteAuths.mapToClass(RemoteAuthRecord);
    // this.workspaces.mapToClass(WorkspaceRecord);
    // this.settings.mapToClass(SettingsRecord);
    // this.disks.mapToClass(DiskRecord);
    // this.historyDocs.mapToClass(HistoryDocRecord);

    applyEncryptionMiddleware<ClientIndexedDb>(
      this as ClientIndexedDb,
      new Uint8Array(new Array(32).fill(0)),
      {
        remoteAuths: cryptoOptions.NON_INDEXED_FIELDS,
      },
      clearAllTables
    );
  }
}
