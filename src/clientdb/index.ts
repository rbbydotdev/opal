import { RemoteAuthRecord } from "@/clientdb/RemoteAuth";
import { SettingsDbRecord, SettingsRecord } from "@/clientdb/Settings";
import { WorkspaceRecord } from "@/clientdb/Workspace";
import { default as Dexie, type EntityTable } from "dexie";
import { applyEncryptionMiddleware, clearAllTables, cryptoOptions } from "dexie-encrypted";
import { DiskDAO, DiskRecord } from "./Disk";
export class ClientIndexedDb extends Dexie {
  workspaces!: EntityTable<WorkspaceRecord, "guid">;
  remoteAuths!: EntityTable<RemoteAuthRecord, "guid">;
  settings!: EntityTable<SettingsRecord, "name">;
  disks!: EntityTable<DiskDAO, "guid">;

  constructor() {
    super("ClientIndexedDb");

    this.version(1).stores({
      settings: "name",
      remoteAuths: "guid",
      workspaces: "guid, name",
      disks: "guid",
    });

    this.remoteAuths.mapToClass(RemoteAuthRecord);
    this.workspaces.mapToClass(WorkspaceRecord);
    this.settings.mapToClass(SettingsDbRecord);
    this.disks.mapToClass(DiskRecord);
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
