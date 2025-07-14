// file: adapter.dexie.ts

import { IGenericStorageAdapter, QueryParams } from "@/components/Editor/history/historyInterfaces";
import Dexie, { IndexableType, Table } from "dexie";

/**
 * A concrete implementation of the IGenericStorageAdapter using Dexie.js.
 * This class handles the low-level database interactions.
 */
export class DexieGenericAdapter<T, K extends IndexableType> implements IGenericStorageAdapter<T, K> {
  private table: Table<T, K>;

  constructor(dbName: string, tableName: string, schema: { [key: string]: string }) {
    const db = new Dexie(dbName);
    db.version(1).stores(schema);
    this.table = db.table(tableName);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mapToClass(classConstructor: new (...args: any[]) => T) {
    this.table.mapToClass(classConstructor);
  }

  async add(item: Omit<T, "edit_id">): Promise<K> {
    return await this.table.add(item as T);
  }

  async get(key: K): Promise<T | null> {
    const result = await this.table.get(key);
    return result ?? null;
  }

  async find(query: QueryParams<T, string>): Promise<T[]> {
    let collection = this.table.where(query.where.indexName as string).equals(query.where.equals);

    if (query.order === "desc") {
      collection = collection.reverse();
    }

    if (query.sortBy) {
      // Dexie's sortBy is terminal, so we apply it last before limit.
      const results = await collection.sortBy(query.sortBy as string);
      return query.limit ? results.slice(0, query.limit) : results;
    }

    if (query.limit) {
      collection = collection.limit(query.limit);
    }

    return await collection.toArray();
  }

  async clear(query: QueryParams<T, string>): Promise<void> {
    await this.table
      .where(query.where.indexName as string)
      .equals(query.where.equals)
      .delete();
  }
}
