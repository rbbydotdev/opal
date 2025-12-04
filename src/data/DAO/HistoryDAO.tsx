import { NullHistoryDAO } from "@/data/dao/NullHistoryDAO";
import { HistoryDocRecord, HistoryStorageInterface } from "@/data/HistoryTypes";
import { ClientDb } from "@/data/instance";
import { useIframeImagePooledImperitiveWorker } from "@/editor/history/EditViewImage";
import { useToggleHistoryImageGeneration } from "@/editor/history/useToggleHistoryImageGeneration";
import { useResource } from "@/hooks/useResource";

import { SuperEmitter } from "@/lib/events/TypeEmitter";
import { liveQuery } from "dexie";
import diff_match_patch, { Diff } from "diff-match-patch";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

// --- Context and Provider for HistorySnapDB ---

type HistorySnapDBContextType = HistoryStorageInterface | null;

const NULL_HISTORY_DAO = new NullHistoryDAO();
const HistorySnapDBContext = createContext<HistorySnapDBContextType>(NULL_HISTORY_DAO);

interface HistorySnapDBProviderProps {
  documentId: string | null;
  workspaceId: string;
  children: ReactNode;
}

export function HistorySnapDBProvider({ documentId, workspaceId, children }: HistorySnapDBProviderProps) {
  const historyDB = useResource<HistoryStorageInterface>(() => new HistoryDAO(), [], NULL_HISTORY_DAO);
  const { isHistoryImageGenerationEnabled } = useToggleHistoryImageGeneration();

  const handleEditPreview = useIframeImagePooledImperitiveWorker({
    workspaceId,
  });
  useEffect(() => {
    if (documentId && historyDB && isHistoryImageGenerationEnabled) {
      return historyDB.onNewEdit(documentId, (edit) => {
        handleEditPreview(edit);
      });
    }
  }, [documentId, handleEditPreview, historyDB, isHistoryImageGenerationEnabled]);

  return (
    <HistorySnapDBContext.Provider value={historyDB || NULL_HISTORY_DAO}>{children}</HistorySnapDBContext.Provider>
  );
}

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
export function useSnapHistoryDB(): HistoryStorageInterface {
  const ctx = useContext(HistorySnapDBContext);
  if (!ctx) {
    throw new Error("useSnapHistoryDB must be used within a HistorySnapDBProvider");
  }
  return ctx;
}

export class HistoryDAO implements HistoryStorageInterface {
  // --- Constants for Threshold Calculation ---
  private readonly TIME_NORMALIZATION_MS = 30 * 1000;
  // Number of characters changed after which a save is highly encouraged
  private readonly CHANGE_NORMALIZATION_CHARS = 100;
  // Weight for the time-based score component
  private readonly TIME_WEIGHT = 0.4;
  // Weight for the change-based score component
  private readonly CHANGE_WEIGHT = 0.6;
  // Bonus added to the score if the change includes structural elements (newlines)
  private readonly STRUCTURAL_CHANGE_BONUS = 0.2;

  unsubs = new Array<() => void>();

  emitter = new SuperEmitter<{
    edits: HistoryDocRecord[];
    new_edit: HistoryDocRecord;
  }>();

  private unsubUpdateListener = liveQuery(() => ClientDb.historyDocs.toArray()).subscribe((edits) => {
    void this.emitter.emit("edits", edits);
  });

  private dmp: diff_match_patch = new diff_match_patch();
  private cache: Map<number, string> = new Map();

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

  /**
   * Calculates a score from 0.0 to 1.0 indicating whether a new edit is
   * significant enough to be saved.
   *
   * The score is based on:
   * 1. Time since the last save.
   * 2. The number of characters inserted or deleted.
   * 3. A bonus for structural changes (e.g., adding new paragraphs).
   *
   * @param documentId The document ID.
   * @param newText The current text of the document.
   * @returns A promise that resolves to a score between 0.0 and 1.0.
   */
  async getSaveThreshold(documentId: string, newText: string): Promise<number> {
    const latestEdit = await this.getLatestEdit(documentId);

    // If this is the first edit ever, it's always important.
    if (!latestEdit) {
      return 1.0;
    }

    // 1. Calculate time-based score
    const timeSinceLastSave = Date.now() - latestEdit.timestamp;
    const timeScore = Math.min(timeSinceLastSave / this.TIME_NORMALIZATION_MS, 1.0);

    // 2. Calculate change-based score
    const parentText = await this.reconstructDocument(latestEdit.edit_id);
    if (parentText === null) {
      // Should not happen if latestEdit exists, but as a safeguard:
      return 1.0;
    }

    const diffs = this.dmp.diff_main(parentText, newText);
    let changeMagnitude = 0;
    let hasStructuralChange = false;
    for (const [operation, text] of diffs) {
      if (operation !== 0) {
        // 0: equal, 1: insert, -1: delete
        changeMagnitude += text.length;
        if (!hasStructuralChange && text.includes("\n")) {
          hasStructuralChange = true;
        }
      }
    }

    const changeScore = Math.min(changeMagnitude / this.CHANGE_NORMALIZATION_CHARS, 1.0);

    // 3. Add bonus for pertinent info (structural changes)
    const bonus = hasStructuralChange ? this.STRUCTURAL_CHANGE_BONUS : 0;

    // 4. Combine scores
    const finalScore = timeScore * this.TIME_WEIGHT + changeScore * this.CHANGE_WEIGHT + bonus;

    // Clamp the final score to a maximum of 1.0
    return Math.min(finalScore, 1.0);
  }

  public async saveEdit(
    workspaceId: string,
    id: string,
    newText: string,
    abortForNewlines = false
  ): Promise<HistoryDocRecord | null> {
    /*
    --- HOW TO USE THE THRESHOLD ---
    You can now call the threshold method at the beginning of saveEdit.
    If the score is too low, you can abort the save.

    const score = await this._getSaveThreshold(id, newText);
    const SAVE_THRESHOLD = 0.3; // Example: Only save if score is > 0.3

    if (score < SAVE_THRESHOLD) {
      console.log(`Save aborted. Score ${score} is below threshold ${SAVE_THRESHOLD}`);
      return 0;
    }
    */

    console.debug("save edit");
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
      return null;
    }

    this.dmp.diff_cleanupEfficiency(diffs);
    const patch = this.dmp.patch_toText(this.dmp.patch_make(parentText || "", diffs));

    const newDoc = new HistoryDocRecord(workspaceId, id, patch, Date.now(), latestEdit ? latestEdit.edit_id! : null);
    const resultId = await ClientDb.historyDocs.add(newDoc);
    void this.emitter.emit("new_edit", HistoryDocRecord.FromJSON({ ...newDoc, edit_id: Number(resultId!) }));
    return newDoc;
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
