import { ClientDb } from "@/Db/instance";
import { liveQuery } from "dexie";
import diff_match_patch, { Diff } from "diff-match-patch";
import Emittery from "emittery";
import { useMemo } from "react";

export class HistoryDocRecord {
  id: string;
  change: string;
  timestamp: number;
  parent: number | null;
  edit_id!: number;
  preview: Blob | null;

  constructor(id: string, change: string, timestamp: number, parent: number | null, preview: Blob | null = null) {
    this.id = id;
    this.change = change;
    this.timestamp = timestamp;
    this.parent = parent;
    this.preview = preview;
  }

  log() {
    console.log(`Document ID: ${this.id}, Edit ID: ${this.edit_id}, Timestamp: ${this.timestamp}`);
    console.log("Change:", this.change);
  }
}

export function useHistoryDAO() {
  return useMemo(() => new HistoryDAO(), []);
}

export class HistoryDAO implements HistoryStorageInterface {
  // public documents!: Table<DocumentChange, number>;

  emitter = new Emittery<{ edits: HistoryDocRecord[] }>();

  private unsubUpdateListener = liveQuery(() => ClientDb.historyDocs.toArray()).subscribe((edits) => {
    void this.emitter.emit("edits", edits);
  });

  private dmp: diff_match_patch = new diff_match_patch();
  private cache: Map<number, string> = new Map();

  onUpdate(documentId: string, cb: (edits: HistoryDocRecord[]) => void) {
    this.emitter.on("edits", (edits) =>
      cb(edits.filter((edit) => edit.id === documentId).sort((a, b) => b.timestamp - a.timestamp))
    );
  }

  tearDown() {
    this.unsubUpdateListener.unsubscribe();
    this.cache.clear();
    // this.dmp = null!;
    // this.close();
  }

  clear(docId: string) {
    return ClientDb.historyDocs.where("id").equals(docId).delete();
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

    return await ClientDb.historyDocs.add(
      new HistoryDocRecord(id, patch, Date.now(), latestEdit ? latestEdit.edit_id! : null)
    );
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
    return ClientDb.historyDocs.where("id").equals(id).delete();
  }

  public async reconstructDocumentFromEdit(edit: HistoryDocRecord): Promise<string | null> {
    let current: HistoryDocRecord | null = edit;
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

  public async getEditByEditId(edit_id: number): Promise<HistoryDocRecord | null> {
    return (await ClientDb.historyDocs.get(edit_id)) ?? null;
  }

  public async getEdits(id: string): Promise<HistoryDocRecord[]> {
    return await ClientDb.historyDocs.where("id").equals(id).reverse().sortBy("timestamp");
  }
  public async getLatestEdit(id: string): Promise<HistoryDocRecord | null> {
    const result = await ClientDb.historyDocs.where("id").equals(id).reverse().sortBy("timestamp");
    return result[0] ?? null;
  }
}

export interface HistoryStorageInterface {
  clear(docId: string): void;
  saveEdit(id: string, newText: string): Promise<number>;
  reconstructDocument(edit_id: number): Promise<string | null>;
  clearAllEdits(id: string): void;
  reconstructDocumentFromEdit(edit: HistoryDocRecord): Promise<string | null>;
  getEditByEditId(edit_id: number): Promise<HistoryDocRecord | null>;
  getEdits(id: string): Promise<HistoryDocRecord[]>;
  getLatestEdit(id: string): Promise<HistoryDocRecord | null>;
  onUpdate: (documentId: string, cb: (edits: HistoryDocRecord[]) => void) => void;
  ready?: Promise<boolean>;
  tearDown?(): void;
  init?(): void;
}
