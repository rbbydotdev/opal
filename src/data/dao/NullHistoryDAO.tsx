import { HistoryDocRecord, HistoryStorageInterface } from "@/data/dao/HistoryDocRecord";

export class NullHistoryDAO implements HistoryStorageInterface {
  onNewEdit(documentId: string, cb: (edit: HistoryDocRecord) => void) {
    return () => {};
  }
  onUpdate(documentId: string, cb: (edits: HistoryDocRecord[]) => void) {
    return () => {};
  }
  clear(docId: string) {}
  async saveEdit(
    workspaceId: string,
    id: string,
    newText: string,
    filePath?: string
  ): Promise<HistoryDocRecord | null> {
    return null;
  }

  async reconstructDocument(edit_id: number): Promise<string | null> {
    return null;
  }
  clearAllEdits(id: string) {}
  async reconstructDocumentFromEdit(edit: HistoryDocRecord): Promise<string | null> {
    return null;
  }
  async getEditByEditId(edit_id: number): Promise<HistoryDocRecord | null> {
    return null;
  }
  async getEdits(id: string): Promise<HistoryDocRecord[]> {
    return [];
  }
  async getLatestEdit(id: string): Promise<HistoryDocRecord | null> {
    return null;
  }
  async updatePreviewForEditId(edit_id: number, preview: Blob): Promise<void> {}
  async getSaveThreshold(documentId: string, newText: string): Promise<number> {
    return 0;
  }
  ready = Promise.resolve(false);
  tearDown() {}
  init() {
    return () => {};
  }
}
