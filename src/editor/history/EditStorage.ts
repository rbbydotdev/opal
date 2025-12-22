import { HistoryDocRecord } from "@/data/dao/HistoryDocRecord";
import { ClientDb } from "@/data/instance";
import * as CRC32 from "crc-32";
import diff_match_patch, { Diff } from "diff-match-patch";

export class EditStorage {
  private dmp: diff_match_patch = new diff_match_patch();
  private cache: Map<number, string> = new Map();

  async clearAllEdits(documentId: string): Promise<number> {
    return ClientDb.historyDocs.where("id").equals(documentId).delete();
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
    this.cache.set(edit_id, text);
    return text;
  };

  async saveEdit({
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

    // Check if the diff is only whitespace
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
    return newDoc;
  }

  tearDown(): void {
    this.cache.clear();
  }

  private async getEditByEditId(edit_id: number): Promise<HistoryDocRecord | null> {
    return (await ClientDb.historyDocs.get(edit_id)) ?? null;
  }

  private async getLatestEdit(documentId: string): Promise<HistoryDocRecord | null> {
    const result = await ClientDb.historyDocs.where("id").equals(documentId).reverse().sortBy("timestamp");
    return result[0] ?? null;
  }
}