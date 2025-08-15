import type { Workspace } from "@/Db/Workspace";
import { AbsPath } from "@/lib/paths2";
import "@/workers/transferHandlers/workspace.th";
import * as Comlink from "comlink";

async function handleMdImageReplace(
  workspace: Workspace,
  origin: string,
  findReplace: [string, string][],
  closeOnComplete = true
): Promise<AbsPath[]> {
  try {
    await workspace.init();
    return !findReplace.length ? [] : await workspace.disk.findReplaceImgBatch(findReplace, origin);
  } catch (e) {
    console.error("Error in handleMdImageReplace:", e);
    throw e;
  } finally {
    await workspace.tearDown();
    if (closeOnComplete) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait a bit to ensure all operations finish
      self.close();
    }
  }
}
export type handleMdImageReplaceType = typeof handleMdImageReplace;
export default Comlink.expose(handleMdImageReplace);
