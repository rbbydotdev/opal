export class HistoryDAO {
  id: string;
  change: string;
  timestamp: number;
  parent: number | null;
  edit_id!: number;
  preview: Blob | null;
  workspaceId: string;
  crc32?: number;
  parentCrc32?: number;

  constructor({
    workspaceId,
    id,
    change,
    timestamp,
    parent,
    preview = null,
    crc32,
    parentCrc32,
  }: {
    workspaceId: string;
    id: string;
    change: string;
    timestamp: number;
    parent: number | null;
    preview: Blob | null;
    crc32?: number;
    parentCrc32?: number;
  }) {
    this.workspaceId = workspaceId;
    this.id = id;
    this.change = change;
    this.timestamp = timestamp;
    this.parent = parent;
    this.preview = preview;
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
    const hdr = new HistoryDAO({ preview: null, ...json });
    return hdr;
  }
}
