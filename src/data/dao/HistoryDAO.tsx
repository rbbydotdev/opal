import { HistoryDocRecord, HistoryStorageInterface } from "@/data/dao/HistoryDocRecord";
import { ClientDb } from "@/data/instance";

import { SuperEmitter } from "@/lib/events/TypeEmitter";
import * as CRC32 from "crc-32";
import { liveQuery } from "dexie";
import diff_match_patch, { Diff } from "diff-match-patch";
import { useEffect, useState } from "react";

export function useSnapHistoryPendingSave({ historyDB }: { historyDB: HistoryStorageInterface }): boolean {
  const [pendingSave, setPendingSave] = useState(false);
  useEffect(() => {
    let timeout = null as ReturnType<typeof setTimeout> | null;
    const unsub = historyDB.onNewEdit("*", () => {
      setPendingSave(true);
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        setPendingSave(false);
      }, 3000);
    });
    return () => {
      clearTimeout(timeout!);
      unsub();
    };
  }, [historyDB]);
  return pendingSave;
}

export class HistoryStore {
  TIME_NORMALIZATION_MS = 5000; // normalize to 5 seconds
  CHANGE_NORMALIZATION_CHARS = 300; // normalize to 300 changed chars
  TIME_WEIGHT = 0.4;
  CHANGE_WEIGHT = 0.5;
  STRUCTURAL_CHANGE_BONUS = 0.2;
  ENTROPY_WEIGHT = 0.1;
  IDLE_THRESHOLD_MS = 2500; // 2.5s pause
  TYPING_SPEED_NORM = 10; // 10 chars/sec baseline

  unsubs = new Array<() => void>();

  emitter = new SuperEmitter<{
    edits: HistoryDocRecord[];
    new_edit: HistoryDocRecord;
  }>();

  private unsubUpdateListener = liveQuery(() => ClientDb.historyDocs.toArray()).subscribe((edits) => {
    this.emitter.emit("edits", edits);
  });

  private dmp: diff_match_patch = new diff_match_patch();
  public cache: Map<number, string> = new Map();

  onUpdate(documentId: string | "*", cb: (edits: HistoryDocRecord[]) => void) {
    const unsub = this.emitter.on("edits", (edits) =>
      cb(edits.filter((edit) => documentId === "*" || edit.id === documentId).sort((a, b) => b.timestamp - a.timestamp))
    );
    this.unsubs.push(unsub);
    return unsub;
  }
  onNewEdit(documentId: string | "*", cb: (edit: HistoryDocRecord) => void) {
    const unsub = this.emitter.on("new_edit", (edit) => {
      if (documentId === "*" || edit.id === documentId) {
        cb(edit);
      }
    });
    this.unsubs.push(unsub);
    return unsub;
  }

  tearDown() {
    this.unsubUpdateListener.unsubscribe();
    this.cache.clear();
    this.unsubs.forEach((unsub) => unsub());
  }

  clear(docId: string) {
    return ClientDb.historyDocs.where("id").equals(docId).delete();
  }

  async getSaveThreshold(documentId: string, newText: string): Promise<number> {
    const latestEdit = await this.getLatestEdit(documentId);

    //  Don't save whitespace-only states
    if (newText.trim().length === 0) {
      return 0.0;
    }

    // If no prior edit, always save
    if (!latestEdit) {
      return 1.0;
    }

    // Compute time since last save
    const timeSinceLastSave = Date.now() - latestEdit.timestamp;
    const timeScore = Math.min(timeSinceLastSave / this.TIME_NORMALIZATION_MS, 1.0);

    // Optional idle detection — treat inactivity as save trigger
    if (timeSinceLastSave > this.IDLE_THRESHOLD_MS) {
      return 1.0; // user paused — commit state
    }

    // Reconstruct parent text and get diffs
    const parentText = await this.reconstructDocument({ edit_id: latestEdit.edit_id });
    if (parentText === null) {
      return 1.0;
    }

    const diffs = this.dmp.diff_main(parentText, newText);

    let changeMagnitude = 0;
    let hasStructuralChange = false;
    let lexicalComplexity = 0; // proxy for how "meaningful" the change is

    for (const [operation, text] of diffs) {
      if (operation !== 0) {
        const len = text.length;
        changeMagnitude += len;

        // rough lexical entropy — longer unique-word changes = higher entropy
        lexicalComplexity += new Set(text.split(/\W+/)).size;

        // detect structural hints
        if (
          text.includes("\n") ||
          /^#{1,6}\s/.test(text) || // markdown headers
          /^(\-|\*)\s/.test(text) || // list items
          /^>\s/.test(text) // blockquotes
        ) {
          hasStructuralChange = true;
        }
      }
    }

    // 4️⃣ Compute scores
    const changeScore = Math.min(changeMagnitude / this.CHANGE_NORMALIZATION_CHARS, 1.0);

    const entropyScore = Math.min(lexicalComplexity / 30, 1.0);

    // 5️⃣ Dynamic weighting based on typing speed
    const typingSpeed = changeMagnitude / (timeSinceLastSave / 1000 + 1e-5); // chars per second
    const normalizedSpeed = Math.min(typingSpeed / this.TYPING_SPEED_NORM, 2.0);
    const dynamicChangeWeight = this.CHANGE_WEIGHT * normalizedSpeed;
    const dynamicTimeWeight = this.TIME_WEIGHT / (normalizedSpeed + 0.5);

    const bonus = (hasStructuralChange ? this.STRUCTURAL_CHANGE_BONUS : 0) + entropyScore * this.ENTROPY_WEIGHT;

    // 6️⃣ Combine + clamp
    const finalScore = timeScore * dynamicTimeWeight + changeScore * dynamicChangeWeight + bonus;

    return Math.min(finalScore, 1.0);
  }

  public async saveEdit({
    workspaceId,
    documentId,
    markdown,
  }: {
    workspaceId: string;
    documentId: string;
    markdown: string;
  }): Promise<HistoryDocRecord | null> {
    console.debug("save edit");
    const latestEdit = await this.getLatestEdit(documentId);
    const parentText = latestEdit ? await this.reconstructDocument({ edit_id: latestEdit.edit_id! }) : "";
    const diffs: Diff[] = this.dmp.diff_main(parentText || "", markdown);
    //check if the diff is only whitespace
    if (
      diffs
        .filter(([operation, _text]) => operation !== 0)
        .every(([_operation, text]) => text.replace("\n\n", "") === "")
    ) {
      console.debug("Aborting edit due to newlines only");
      return null;
    }

    this.dmp.diff_cleanupEfficiency(diffs);
    const patch = this.dmp.patch_toText(this.dmp.patch_make(parentText || "", diffs));

    // Calculate CRC32 for the new content and get parent's CRC32
    const newContentCrc32 = CRC32.str(markdown);
    const parentCrc32 = latestEdit?.crc32 ?? undefined;

    const newDoc = new HistoryDocRecord(
      workspaceId,
      documentId,
      patch,
      Date.now(),
      latestEdit ? latestEdit.edit_id! : null,
      null,
      newContentCrc32,
      parentCrc32
    );
    const resultId = await ClientDb.historyDocs.add(newDoc);
    void this.emitter.emit("new_edit", HistoryDocRecord.FromJSON({ ...newDoc, edit_id: Number(resultId!) }));
    return newDoc;
  }

  reconstructDocument = async ({ edit_id }: { edit_id: number }): Promise<string> => {
    if (this.cache.has(edit_id)) return this.cache.get(edit_id)!;

    let current = await this.getEditByEditId(edit_id);
    if (!current) throw new Error(`Edit with ID ${edit_id} not found for reconstruction.`);
    let text = "";
    const patches = [];
    while (current) {
      patches.unshift(current.change);
      current = current.parent !== null ? await this.getEditByEditId(current.parent) : null;
    }
    for (const patchText of patches) {
      const patch = this.dmp.patch_fromText(patchText);
      text = this.dmp.patch_apply(patch, text)[0];
    }
    this.cache.set(edit_id, text).get(edit_id);
    return text;
  };
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

  static async removeAllForWorkspaceId(workspaceId: string): Promise<number> {
    return ClientDb.historyDocs.where("workspaceId").equals(workspaceId).delete();
  }

  public async updatePreviewForEditId(edit_id: number, preview: Blob): Promise<void> {
    const edit = await this.getEditByEditId(edit_id);
    if (edit) {
      await ClientDb.historyDocs.update(edit_id, { preview });
    } else {
      console.warn(`Edit with ID ${edit_id} not found for updating preview.`);
    }
  }
  public async updatePreviewForEdit(edit: HistoryDocRecord, preview: Blob): Promise<void> {
    edit.preview = preview;
    await ClientDb.historyDocs.put(edit);
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
