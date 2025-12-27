import { HistoryDAO } from "@/data/dao/HistoryDOA";
import { ClientDb } from "@/data/db/DBInstance";
import diff_match_patch, { Diff } from "diff-match-patch";

export class HistoryDB {
  private dmp: diff_match_patch = new diff_match_patch();
  private cache: Map<number, string> = new Map();

  // private backprocessController: AbortController = new AbortController();

  async clearAllEdits(documentId: string): Promise<number> {
    return ClientDb.historyDocs.where("id").equals(documentId).delete();
  }

  static MoveEdits = async ({
    workspaceId,
    changeSet,
  }: {
    workspaceId: string;
    changeSet: [oldPath: string, newPath: string][];
  }): Promise<void> => {
    const changeSetMap = new Map(changeSet);
    await ClientDb.transaction("rw", ClientDb.historyDocs, async () => {
      const affectedRecords = await ClientDb.historyDocs
        .where({ workspaceId })
        .and((edit) => changeSetMap.has(edit.id))
        .toArray();
      if (affectedRecords.length === 0) return;
      await ClientDb.historyDocs.bulkPut(
        affectedRecords.map((record) => ({
          ...record,
          id: changeSetMap.get(record.id)!,
          path: changeSetMap.get(record.id)!,
        }))
      );
    });
  };

  public async updatePreviewForEditId(edit_id: number, preview: Blob): Promise<void> {
    await ClientDb.historyDocs.update(edit_id, { preview });
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
    prevMarkdown,
  }: {
    workspaceId: string;
    documentId: string;
    markdown: string;
    prevMarkdown?: string | null;
  }): Promise<HistoryDAO | null> {
    let latestEdit = await this.getLatestEdit(documentId);
    if (!latestEdit && typeof prevMarkdown === "string") {
      latestEdit = await HistoryDAO.Add({
        workspaceId,
        id: documentId,
        change: this.dmp.patch_toText(this.dmp.patch_make("", prevMarkdown)),
        timestamp: Date.now(),
        parent: null,
        preview: null,
      })!;
    }
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
    const change = this.dmp.patch_toText(this.dmp.patch_make(parentText || "", diffs));

    return HistoryDAO.Add({
      workspaceId,
      id: documentId,
      change,
      timestamp: Date.now(),
      parent: latestEdit ? latestEdit.edit_id! : null,
      preview: null,
    });
  }

  tearDown(): void {
    this.cache.clear();
    // this.backprocessController.abort();
  }

  private async getEditByEditId(edit_id: number): Promise<HistoryDAO | null> {
    return (await ClientDb.historyDocs.get(edit_id)) ?? null;
  }

  private async getLatestEdit(documentId: string): Promise<HistoryDAO | null> {
    const result = await ClientDb.historyDocs.where("id").equals(documentId).reverse().sortBy("timestamp");
    return result[0] ?? null;
  }
}

// initPreviewLFU = ({ workspaceId, documentId }: { workspaceId: string | null; documentId: string | null }) => {
//   if (!documentId || !workspaceId) return () => {};

//   void (async () => {
//     while (!this.backprocessController.signal.aborted) {
//       await new Promise((resolve) => {
//         const timeout = setTimeout(resolve, 10_000);
//         this.backprocessController.signal.addEventListener(
//           "abort",
//           () => {
//             clearTimeout(timeout);
//           },
//           {
//             once: true,
//           }
//         );
//       });

//       const MAX_PREVIEW_CACHE_SIZE = 5 * 1024 * 1024; // 5 MB
//       let currentCacheSize = 0;
//       let cutoffTimestamp: number | null = null;

//       const edits = await ClientDb.historyDocs.where({ workspaceId, id: documentId }).reverse().sortBy("timestamp");

//       for (const edit of edits) {
//         if (this.backprocessController.signal.aborted) break;

//         if (edit.preview) {
//           const previewSize = edit.preview.size;
//           if (currentCacheSize + previewSize <= MAX_PREVIEW_CACHE_SIZE) {
//             currentCacheSize += previewSize;
//           } else {
//             // Mark the first record that exceeds our limit
//             cutoffTimestamp = edit.timestamp;
//             break;
//           }
//         }

//         // yield to stay responsive
//         await new Promise((rs) => queueMicrotask(() => rs(void 0)));
//       }
//       if (this.backprocessController.signal.aborted) break;

//       // After loop: clear previews older than cutoffTimestamp
//       if (cutoffTimestamp) {
//         await ClientDb.historyDocs
//           .where({ workspaceId, id: documentId })
//           .and((e) => e.timestamp <= cutoffTimestamp && e.preview !== null)
//           .modify({ preview: null });
//       }
//     }
//   })();
//   return () => {
//     this.backprocessController.abort();
//   };
// };
