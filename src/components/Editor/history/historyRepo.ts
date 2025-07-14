// file: repository.ts

import { DocumentChange } from "@/components/Editor/history/HistoryDB";
import { IGenericStorageAdapter, IHistoryRepository } from "@/components/Editor/history/historyInterfaces";

/**
 * Implements the IHistoryRepository interface.
 * This class acts as a bridge between the business logic (Service) and the
 * generic data access layer (DAO).
 */
export class HistoryRepository implements IHistoryRepository {
  private dao: IGenericStorageAdapter<DocumentChange, number>;

  constructor(dataAccessObject: IGenericStorageAdapter<DocumentChange, number>) {
    this.dao = dataAccessObject;
  }

  addChange(change: Omit<DocumentChange, "edit_id">): Promise<number> {
    return this.dao.add(change);
  }

  getChangeByEditId(edit_id: number): Promise<DocumentChange | null> {
    return this.dao.get(edit_id);
  }

  getAllChanges(docId: string): Promise<DocumentChange[]> {
    return this.dao.find({
      where: { indexName: "id", equals: docId },
      sortBy: "timestamp",
      order: "desc",
    });
  }

  async getLatestChange(docId: string): Promise<DocumentChange | null> {
    const results = await this.dao.find({
      where: { indexName: "id", equals: docId },
      sortBy: "timestamp",
      order: "desc",
      limit: 1,
    });
    return results[0] ?? null;
  }

  clearChanges(docId: string): Promise<void> {
    return this.dao.clear({
      where: { indexName: "id", equals: docId },
    });
  }
}
