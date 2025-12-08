export class HistoryDocRecord {
  id: string;
  change: string;
  timestamp: number;
  parent: number | null;
  edit_id!: number;
  preview: Blob | null;
  workspaceId: string;
  filePath?: string;
  crc32?: number;
  parentCrc32?: number;

  constructor(
    workspaceId: string,
    id: string,
    change: string,
    timestamp: number,
    parent: number | null,
    preview: Blob | null = null,
    filePath?: string,
    crc32?: number,
    parentCrc32?: number
  ) {
    this.workspaceId = workspaceId;
    this.id = id;
    this.change = change;
    this.timestamp = timestamp;
    this.parent = parent;
    this.preview = preview;
    this.filePath = filePath;
    this.crc32 = crc32;
    this.parentCrc32 = parentCrc32;
  }
  static FromJSON(json: {
    workspaceId: string;
    id: string;
    edit_id: number;
    change: string;
    timestamp: number;
    parent: number | null;
    preview?: Blob | null;
    filePath?: string;
    crc32?: number;
    parentCrc32?: number;
  }) {
    const hdr = new HistoryDocRecord(
      json.workspaceId,
      json.id,
      json.change,
      json.timestamp,
      json.parent,
      json.preview ?? null,
      json.filePath,
      json.crc32,
      json.parentCrc32
    );
    hdr.edit_id = json.edit_id;
    return hdr;
  }
}

export interface HistoryStorageInterface {
  clear(docId: string): void;
  saveEdit(workspaceId: string, id: string, newText: string, filePath?: string): Promise<HistoryDocRecord | null>;
  reconstructDocument(edit_id: number): Promise<string | null>;
  clearAllEdits(id: string): void;
  reconstructDocumentFromEdit(edit: HistoryDocRecord): Promise<string | null>;
  getEditByEditId(edit_id: number): Promise<HistoryDocRecord | null>;
  getEdits(id: string): Promise<HistoryDocRecord[]>;
  getLatestEdit(id: string): Promise<HistoryDocRecord | null>;
  updatePreviewForEditId(edit_id: number, preview: Blob): Promise<void>;
  onUpdate: (documentId: string, cb: (edits: HistoryDocRecord[]) => void) => () => void;
  onNewEdit: (documentId: string, cb: (edit: HistoryDocRecord) => void) => () => void;
  tearDown(): void;
  getSaveThreshold(documentId: string, newText: string): Promise<number>;
  ready?: Promise<boolean>;
  init?(): () => void;
}
