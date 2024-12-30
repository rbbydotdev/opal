// import { Disk as DiskDbRecord, Disk } from '@/disk/disk';
import { RemoteAuthDbRecord, RemoteAuthRecord } from "@/clientdb/Provider";
import { SettingsDbRecord, SettingsRecord } from "@/clientdb/Settings";
import { Workspace, WorkspaceDbRecord, WorkspaceRecord } from "@/clientdb/Workspace";
import { Disk, DiskDbRecord, DiskRecord } from "@/disk/disk";
import { default as Dexie, type EntityTable } from "dexie";
import { applyEncryptionMiddleware, clearAllTables, cryptoOptions } from "dexie-encrypted";
// const db = new Dexie("decrypt-test-2");
// export class ClientIndexedDb extends Dexie {

const WORKSPACE_SEED: WorkspaceRecord[] = [];
export class ClientIndexedDb extends Dexie {
  workspaces!: EntityTable<WorkspaceRecord, "guid">;
  remoteAuths!: EntityTable<RemoteAuthRecord, "guid">;
  settings!: EntityTable<SettingsRecord, "name">;
  disks!: EntityTable<DiskRecord, "guid">;

  getRemoteAuthByGuid = (guid: string) => {
    return this.remoteAuths.where("guid").equals(guid).first();
  };
  updateRemoteAuth = (RemoteAuth: RemoteAuthDbRecord | RemoteAuthRecord) => {
    return this.remoteAuths.put(RemoteAuth);
  };

  updateDisk = async (disk: DiskDbRecord | Disk) => {
    return this.disks.put(disk instanceof Disk ? disk.toJSON() : disk);
  };

  getDiskByGuid = (guid: string) => this.disks.where("guid").equals(guid).first();

  getWorkspaceByGuid = (guid: string) => this.workspaces.where("guid").equals(guid).first();

  updateWorkspace = async (workspace: WorkspaceRecord | Workspace) => {
    return this.workspaces.put(workspace instanceof Workspace ? workspace.toJSON() : workspace);
  };

  allWorkspaces = () => this.workspaces.toArray();

  constructor() {
    super("ClientIndexedDb");

    //TODO DELETE ME
    this.on("ready", () => {
      (async () => {
        //TODO: a regular async seems to be blocking the db?
        if ((await this.workspaces.count()) === 0) {
          this.workspaces
            .bulkAdd(
              // WORKSPACE_SEED.map((workspace) => (workspace instanceof Workspace ? workspace.toJSON() : workspace))
              WORKSPACE_SEED
            )
            .then(() => {
              console.log("Seeded workspaces");
            });
        }
      })();
    });

    this.version(1).stores({
      settings: "name",
      remoteAuths: "guid",
      workspaces: "guid",
      disks: "guid",
    });

    this.remoteAuths.mapToClass(RemoteAuthDbRecord);
    this.workspaces.mapToClass(WorkspaceDbRecord);
    this.settings.mapToClass(SettingsDbRecord);
    this.disks.mapToClass(DiskDbRecord);
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
