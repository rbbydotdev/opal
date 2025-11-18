import { BuildRecord } from "@/data/BuildRecord";
import { DiskRecord } from "@/data/disk/DiskRecord";
import { HistoryDocRecord } from "@/data/HistoryTypes";
import { RemoteAuthRecord } from "@/data/RemoteAuthTypes";
import { SettingsRecord } from "@/data/SettingsRecord";
import { DestinationRecord } from "@/lib/FileTree/DestinationRecord";
import { default as Dexie, type EntityTable } from "dexie";
import { applyEncryptionMiddleware, clearAllTables, cryptoOptions } from "dexie-encrypted";
import { WorkspaceRecord } from "./WorkspaceRecord";

export class ClientIndexedDb extends Dexie {
  workspaces!: EntityTable<WorkspaceRecord, "guid">;
  remoteAuths!: EntityTable<RemoteAuthRecord, "guid">;
  destinations!: EntityTable<DestinationRecord, "guid">;

  settings!: EntityTable<SettingsRecord, "name">;
  disks!: EntityTable<DiskRecord, "guid">;
  builds!: EntityTable<BuildRecord, "guid">;

  historyDocs!: EntityTable<HistoryDocRecord, "edit_id">; // Auto-increment edit_id

  constructor() {
    super("ClientIndexedDb");

    this.version(1).stores({
      settings: "name",
      remoteAuths: "guid,type,timestamp",
      workspaces: "guid,name,timestamp",
      disks: "guid,timestamp",
      builds: "guid,diskId,timestamp,workspaceId",
      thumbnails: "[workspaceId+path],guid,path,workspaceId",
      historyDocs: "++edit_id,id,parent,workspaceId",
      destinations: "guid,type,timestamp,remoteAuthGuid",
    });

    applyEncryptionMiddleware<ClientIndexedDb>(
      this as ClientIndexedDb,
      new Uint8Array(new Array(32).fill(0)),
      {
        remoteAuths: cryptoOptions.NON_INDEXED_FIELDS,
      },
      clearAllTables
    );

    this.destinations.hook("creating", (_primaryKey, obj) => {
      obj.remoteAuthGuid = obj.remoteAuth?.guid ?? null;
    });

    this.destinations.hook("updating", (mods: Partial<DestinationRecord>) => {
      if (mods.remoteAuth?.guid) return { remoteAuthGuid: mods.remoteAuth.guid };
    });

    this.remoteAuths.hook("deleting", (_primaryKey, remoteAuth, _tx) => {
      return this.destinations.where("remoteAuthId").equals(remoteAuth.guid).delete();
    });
  }
}
