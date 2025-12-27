import { ClientDb } from "@/data/db/DBInstance";

interface HistoryDOC {
  id: string;
  change: string;
  timestamp: number;
  parent: number | null;
  edit_id: number;
  preview: Blob | null;
  workspaceId: string;
}

export class HistoryDAO implements HistoryDOC {
  id: string;
  change: string;
  timestamp: number;
  parent: number | null;
  edit_id!: number;
  preview: Blob | null;
  workspaceId: string;

  constructor({
    workspaceId,
    id,
    change,
    timestamp,
    parent,
    preview = null,
  }: {
    workspaceId: string;
    id: string;
    change: string;
    timestamp: number;
    parent: number | null;
    preview: Blob | null;
  }) {
    this.workspaceId = workspaceId;
    this.id = id;
    this.change = change;
    this.timestamp = timestamp;
    this.parent = parent;
    this.preview = preview;
  }
  static Add = async (doc: Omit<HistoryDOC, "edit_id">) => {
    const historyDoc = new HistoryDAO(doc);
    const editId = await ClientDb.historyDocs.add(historyDoc);
    historyDoc.edit_id = editId;
    return historyDoc;
  };

  static FromJSON(json: {
    workspaceId: string;
    id: string;
    edit_id: number;
    change: string;
    timestamp: number;
    parent: number | null;
    preview?: Blob | null;
    filePath?: string;
  }) {
    const hdr = new HistoryDAO({ preview: null, ...json });
    return hdr;
  }
}
