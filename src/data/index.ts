import { DestinationRecord } from "@/components/sidebar/FileTree/DestinationRecord";
import { BuildRecord } from "@/data/dao/BuildRecord";
import { DeployRecord } from "@/data/DeployRecord";
import { DiskRecord } from "@/data/disk/DiskRecord";
import { HistoryDocRecord } from "@/data/HistoryTypes";
import { RemoteAuthRecord } from "@/data/RemoteAuthTypes";
import { SettingsRecord } from "@/data/SettingsRecord";
import { default as Dexie, Table, type EntityTable } from "dexie";
import { applyEncryptionMiddleware, clearAllTables, cryptoOptions } from "dexie-encrypted";
import { WorkspaceRecord } from "./WorkspaceRecord";

export class ClientIndexedDb extends Dexie {
  workspaces!: EntityTable<WorkspaceRecord, "guid">;
  remoteAuths!: EntityTable<RemoteAuthRecord, "guid">;
  destinations!: EntityTable<DestinationRecord, "guid">;

  settings!: EntityTable<SettingsRecord, "name">;
  disks!: EntityTable<DiskRecord, "guid">;
  builds!: EntityTable<BuildRecord, "guid">;
  deployments!: EntityTable<DeployRecord, "guid">;

  historyDocs!: EntityTable<HistoryDocRecord, "edit_id">; // Auto-increment edit_id

  constructor() {
    super("ClientIndexedDb");

    this.version(3).stores({
      settings: "name",
      remoteAuths: "guid,type,timestamp",
      workspaces: "guid,name,timestamp",
      disks: "guid,timestamp",
      builds: "guid,diskId,timestamp,workspaceId",
      deployments: "guid,buildId,timestamp,workspaceId,destinationType",
      thumbnails: "[workspaceId+path],guid,path,workspaceId",
      historyDocs: "++edit_id,id,parent,workspaceId",
      destinations: "guid,label,type,timestamp,remoteAuthGuid",
    });

    applyEncryptionMiddleware<ClientIndexedDb>(
      this as ClientIndexedDb,
      new Uint8Array(new Array(32).fill(0)),
      {
        remoteAuths: cryptoOptions.NON_INDEXED_FIELDS,
      },
      clearAllTables
    );
    // === DESTINATIONS ===
    this.destinations.hook("creating", (_primaryKey, obj) => {
      obj.remoteAuthGuid = obj.remoteAuth?.guid ?? null;
    });

    this.destinations.hook("updating", (mods: Partial<DestinationRecord>) => {
      if (mods.remoteAuth?.guid) {
        return { remoteAuthGuid: mods.remoteAuth.guid };
      }
    });

    // === REMOTEAUTHS ===
    this.remoteAuths.hook("deleting", (primaryKey, remoteAuth, tx) => {
      // Wait until this transaction finishes, then do cleanup.
      tx.on("complete", async () => {
        await this.destinations.where("remoteAuthGuid").equals(primaryKey).delete();
      });
    });

    // === BUILDS ===
    this.builds.hook("deleting", (_primaryKey, build, tx) => {
      // Delete related deployments when build is deleted
      const buildId = build.guid;
      tx.on("complete", async () => {
        await this.deployments.where("buildId").equals(buildId).delete();
      });
    });

    // === WORKSPACES ===
    this.workspaces.hook("deleting", (_primaryKey, workspace, tx) => {
      // Avoid nested transaction error — wait until after the workspace delete finishes.
      tx.on("complete", async () => {
        await Promise.all([
          this.disks.where("guid").equals(workspace.disk.guid).delete(),
          this.disks.where("guid").equals(workspace.thumbs.guid).delete(),
          this.builds.where("workspaceId").equals(workspace.guid).delete(),
          this.deployments.where("workspaceId").equals(workspace.guid).delete(),
          this.historyDocs.where("workspaceId").equals(workspace.guid).delete(),
        ]);
      });
    });

    this.attachTimestampHooks();
  }

  private attachTimestampHooks(tables: Table<any, any>[] = this.tables) {
    for (const table of tables) {
      table.hook("creating", (_pk, obj) => {
        obj.timestamp = new Date();
      });
    }
  }
}
