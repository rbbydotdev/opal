// file: interfaces.ts

// --- Data Model ---
export class DocumentChange {
  id: string;
  change: string;
  timestamp: number;
  parent: number | null;
  edit_id!: number; // Primary Key

  constructor(id: string, change: string, timestamp: number, parent: number | null) {
    this.id = id;
    this.change = change;
    this.timestamp = timestamp;
    this.parent = parent;
  }
}

// --- Layer 1: Generic DAO Interface ---

/**
 * A generic query structure for the DAO layer.
 */
export interface QueryParams<T, U> {
  where: {
    indexName: keyof T;
    equals: U;
  };
  sortBy?: keyof T;
  order?: "asc" | "desc";
  limit?: number;
}

/**
 * The most generic storage interface (DAO). It is "blind" to the business logic
 * and only knows how to perform basic CRUD operations.
 * @template T The type of the object being stored.
 * @template K The type of the primary key for that object.
 */
export interface IGenericStorageAdapter<T, K, U = string> {
  add(item: Omit<T, "edit_id">): Promise<K>;
  get(key: K): Promise<T | null>;
  find(query: QueryParams<T, U>): Promise<T[]>;
  clear(query: QueryParams<T, U>): Promise<void>;
}

// --- Layer 2: Repository Interface ---

/**
 * Defines the contract for accessing document history data.
 * It translates business needs into queries for the generic DAO.
 */
export interface IHistoryRepository {
  addChange(change: Omit<DocumentChange, "edit_id">): Promise<number>;
  getChangeByEditId(edit_id: number): Promise<DocumentChange | null>;
  getAllChanges(docId: string): Promise<DocumentChange[]>;
  getLatestChange(docId: string): Promise<DocumentChange | null>;
  clearChanges(docId: string): Promise<void>;
}
