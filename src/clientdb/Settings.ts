import { ClientIndexedDb } from "@/clientdb";
import { Entity } from "dexie";

export class SettingsDbRecord extends Entity<ClientIndexedDb> {
  name!: string;
  value!: object;
}
export interface SettingsRecord {
  name: string;
  value: object;
}
