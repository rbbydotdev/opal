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

export interface IHistoryRepository {
  addChange(change: Omit<DocumentChange, "edit_id">): Promise<number>;
  getChangeByEditId(edit_id: number): Promise<DocumentChange | null>;
  getAllChanges(docId: string): Promise<DocumentChange[]>;
  getLatestChange(docId: string): Promise<DocumentChange | null>;
  clearChanges(docId: string): Promise<void>;
}
