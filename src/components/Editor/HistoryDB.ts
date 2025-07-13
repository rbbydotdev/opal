import Dexie, { Table } from "dexie";
import diff_match_patch, { Diff } from "diff-match-patch";

export class DocumentChange {
  id: string;
  change: string;
  timestamp: number;
  parent: number | null;
  edit_id!: number;

  constructor(id: string, change: string, timestamp: number, parent: number | null) {
    this.id = id;
    this.change = change;
    this.timestamp = timestamp;
    this.parent = parent;
  }

  log() {
    console.log(`Document ID: ${this.id}, Edit ID: ${this.edit_id}, Timestamp: ${this.timestamp}`);
    console.log("Change:", this.change);
  }
}

class HistoryDB extends Dexie {
  public documents!: Table<DocumentChange, number>;

  private dmp: diff_match_patch;
  private cache: Map<number, string>;

  constructor() {
    super("EditHistoryDB");
    this.version(1).stores({
      documents: "++edit_id,id,parent", // Auto-increment edit_id
    });

    this.documents.mapToClass(DocumentChange);
    this.dmp = new diff_match_patch();
    this.cache = new Map();
  }

  clear(docId: string) {
    return this.documents.where("id").equals(docId).delete();
  }

  public async saveEdit(id: string, newText: string, abortForNewlines = false): Promise<number> {
    const latestEdit = await this.getLatestEdit(id);
    const parentText = latestEdit ? await this.reconstructDocument(latestEdit.edit_id!) : "";
    const diffs: Diff[] = this.dmp.diff_main(parentText || "", newText);
    //check if the diff is only whitespace
    if (
      abortForNewlines &&
      diffs
        .filter(([operation, _text]) => operation !== 0)
        .every(([_operation, text]) => text.replace("\n\n", "") === "")
    ) {
      console.log("Aborting edit due to newlines only");
      return 0;
    }

    this.dmp.diff_cleanupEfficiency(diffs);
    const patch = this.dmp.patch_toText(this.dmp.patch_make(parentText || "", diffs));

    return await this.documents.add(new DocumentChange(id, patch, Date.now(), latestEdit ? latestEdit.edit_id! : null));
  }

  public async reconstructDocument(edit_id: number): Promise<string | null> {
    if (this.cache.has(edit_id)) {
      return this.cache.get(edit_id)!;
    }

    let current = await this.getEditByEditId(edit_id);
    if (!current) return null;

    let text = "";
    const patches = [];

    while (current) {
      patches.unshift(current.change);
      current = current.parent !== null ? await this.getEditByEditId(current.parent) : null;
    }

    for (const patchText of patches) {
      const patch = this.dmp.patch_fromText(patchText);
      [text] = this.dmp.patch_apply(patch, text);
    }

    this.cache.set(edit_id, text);
    return text;
  }
  public async clearAllEdits(id: string) {
    return this.documents.where("id").equals(id).delete();
  }

  public async reconstructDocumentFromEdit(edit: DocumentChange): Promise<string | null> {
    let current: DocumentChange | null = edit;
    const patches: string[] = [];

    while (current) {
      patches.unshift(current.change);
      current = current.parent !== null ? await this.getEditByEditId(current.parent) : null;
    }

    let text = "";
    for (const patchText of patches) {
      const patch = this.dmp.patch_fromText(patchText);
      [text] = this.dmp.patch_apply(patch, text);
    }

    return text;
  }

  public async getEditByEditId(edit_id: number): Promise<DocumentChange | null> {
    return (await this.documents.get(edit_id)) ?? null;
  }

  public async getEdits(id: string): Promise<DocumentChange[]> {
    return await this.documents.where("id").equals(id).reverse().sortBy("timestamp");
  }
  public async getLatestEdit(id: string): Promise<DocumentChange | null> {
    const result = await this.documents.where("id").equals(id).reverse().sortBy("timestamp");
    return result[0] ?? null;
  }
}

// Create and export the singleton instance
export const historyDB = new HistoryDB();
const _HistoryDBDocuments = historyDB.documents;
