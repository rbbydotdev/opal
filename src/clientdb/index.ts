// import { Disk as DiskDbRecord, Disk } from '@/disk/disk';
import { ProviderAuthDbRecord } from "@/clientdb/Provider";
import { SettingsDBRecord } from "@/clientdb/Settings";
import { Workspace, WorkspaceDbRecord } from "@/clientdb/Workspace";
import { Disk } from "@/disk/disk";
import { default as Dexie, type EntityTable } from "dexie";
import { applyEncryptionMiddleware, clearAllTables, cryptoOptions } from "dexie-encrypted";
// const db = new Dexie("decrypt-test-2");
// export class ClientIndexedDb extends Dexie {

const WORKSPACE_SEED: Workspace[] = [];
export class ClientIndexedDb extends Dexie {
  workspaces!: EntityTable<WorkspaceRecord, "id">;
  providerAuths!: EntityTable<ProviderAuthDbRecord, "id">;
  settings!: EntityTable<SettingsDBRecord, "name">;
  disks!: EntityTable<Disk, "guid">;

  constructor() {
    super("ClientIndexedDb");

    //TODO DELETE ME
    this.on("ready", () => {
      (async () => {
        //TODO: a regular async seems to be blocking the db?
        if ((await this.workspaces.count()) === 0) {
          this.workspaces.bulkAdd(WORKSPACE_SEED).then(() => {
            console.log("Seeded workspaces");
          });
        }
      })();
    });

    this.version(1).stores({
      settings: "name",
      providerAuths: "++id",
      workspaces: "++id, name, providerAuthId",
      disks: "guid",
    });

    this.providerAuths.mapToClass(ProviderAuthDbRecord);
    this.workspaces.mapToClass(WorkspaceDbRecord);
    applyEncryptionMiddleware<ClientIndexedDb>(
      this as ClientIndexedDb,
      new Uint8Array(new Array(32).fill(0)),
      {
        providerAuths: cryptoOptions.NON_INDEXED_FIELDS,
      },
      clearAllTables
    );
  }
}
