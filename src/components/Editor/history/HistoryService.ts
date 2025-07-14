// file: service.ts

import { DocumentChange, IHistoryRepository } from "@/components/Editor/history/historyInterfaces";
import diff_match_patch, { Diff } from "diff-match-patch";

/**
 * Handles the core business logic for document history.
 * Depends on the repository layer for data access.
 */
export class DocumentHistoryService {
  private repository: IHistoryRepository; // Changed from 'storage'
  private dmp: diff_match_patch;
  private cache: Map<number, string>;

  constructor(historyRepository: IHistoryRepository) {
    this.repository = historyRepository; // Changed
    this.dmp = new diff_match_patch();
    this.cache = new Map();
  }

  public async saveEdit(id: string, newText: string, abortForNewlines = false): Promise<number> {
    const latestEdit = await this.repository.getLatestChange(id); // Changed
    // ... rest of the method is identical
    const parentText = latestEdit ? await this.reconstructDocument(latestEdit.edit_id) : "";

    if (parentText === null) {
      throw new Error("Failed to reconstruct parent document text.");
    }

    const diffs: Diff[] = this.dmp.diff_main(parentText, newText);

    if (abortForNewlines && diffs.filter(([op]) => op !== 0).every(([, text]) => text.trim() === "")) {
      return 0;
    }

    this.dmp.diff_cleanupEfficiency(diffs);
    const patch = this.dmp.patch_toText(this.dmp.patch_make(parentText, diffs));

    const newChange = new DocumentChange(id, patch, Date.now(), latestEdit ? latestEdit.edit_id : null);

    return this.repository.addChange(newChange); // Changed
  }

  public async reconstructDocument(edit_id: number): Promise<string | null> {
    // ... implementation uses this.repository.getChangeByEditId ...
    // This method's logic remains the same, just the dependency name changes.
    if (this.cache.has(edit_id)) {
      return this.cache.get(edit_id)!;
    }

    let current = await this.repository.getChangeByEditId(edit_id);
    if (!current) return null;

    const patches: string[] = [];
    while (current) {
      patches.unshift(current.change);
      current = current.parent !== null ? await this.repository.getChangeByEditId(current.parent) : null;
    }

    let text = "";
    for (const patchText of patches) {
      const patch = this.dmp.patch_fromText(patchText);
      [text] = this.dmp.patch_apply(patch, text);
    }

    this.cache.set(edit_id, text);
    return text;
  }

  public async getEdits(id: string): Promise<DocumentChange[]> {
    return this.repository.getAllChanges(id); // Changed
  }

  public async clearAllEdits(id: string): Promise<void> {
    return this.repository.clearChanges(id); // Changed
  }
}
