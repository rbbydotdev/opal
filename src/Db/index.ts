import { SettingsRecord } from "@/Db/SettingsRecord";
import { default as Dexie, type EntityTable } from "dexie";
import { applyEncryptionMiddleware, clearAllTables, cryptoOptions } from "dexie-encrypted";
import { DiskRecord } from "./DiskRecord";
import { RemoteAuthRecord } from "./RemoteAuthRecord";
import { WorkspaceRecord } from "./WorkspaceRecord";

export class ClientIndexedDb extends Dexie {
  workspaces!: EntityTable<WorkspaceRecord, "guid">;
  remoteAuths!: EntityTable<RemoteAuthRecord, "guid">;
  settings!: EntityTable<SettingsRecord, "name">;
  disks!: EntityTable<DiskRecord, "guid">;
  // thumbnails!: Dexie.Table<ThumbnailRecord, [string, string] | string>;

  constructor() {
    super("ClientIndexedDb");

    this.version(1).stores({
      settings: "name",
      remoteAuths: "guid",
      workspaces: "guid, name",
      disks: "guid",
      thumbnails: "[workspaceId+path], guid, path, workspaceId",
    });

    this.remoteAuths.mapToClass(RemoteAuthRecord);
    this.workspaces.mapToClass(WorkspaceRecord);
    this.settings.mapToClass(SettingsRecord);
    this.disks.mapToClass(DiskRecord);
    // this.thumbnails.mapToClass(ThumbnailRecord);
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
