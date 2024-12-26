import { default as Dexie, Entity, type EntityTable } from "dexie";
import { applyEncryptionMiddleware, clearAllTables, cryptoOptions } from "dexie-encrypted";
// const db = new Dexie("decrypt-test-2");
export class ClientDb extends Dexie {
  providerAuth!: EntityTable<ProviderAuthDb, "id">;
  workspace!: EntityTable<WorkspaceDB, "id">;
  settings!: EntityTable<SettingsDB, "name">;

  constructor() {
    super("ClientDb");
    this.version(1).stores({
      settings: "name",
      providerAuth: "++id",
      workspace: "++id, name",
    });

    this.providerAuth.mapToClass(ProviderAuthDb);
    this.workspace.mapToClass(WorkspaceDB);

    applyEncryptionMiddleware(
      this as ClientDb,
      new Uint8Array(new Array(32).fill(0)),
      {
        providerAuth: cryptoOptions.NON_INDEXED_FIELDS,
      },
      clearAllTables
    );
  }
}

export class SettingsDB extends Entity<ClientDb> {
  name!: string;
  value!: object;
}

class WorkspaceDB extends Entity<ClientDb> {
  id!: number;
  name!: string;
  type!: string;
  description!: string;
  href!: string;
  createdAt!: Date;
}

class ProviderAuthDb extends Entity<ClientDb> {
  id!: number;
  type!: string;
  accessToken!: string; // The access token used to authenticate requests
  tokenType!: string; // Typically "Bearer"
  expiresIn!: number; // Time in seconds until the token expires
  refreshToken!: string; // Optional: The refresh token to obtain new access tokens
  scope!: string; // The scopes granted by the user
  obtainedAt!: number; // Timestamp when the token was obtained
  idToken!: string; // Optional: JWT token containing user identity information
}
