import type { Workspace } from "@/Db/Workspace";
import { AbsPath } from "@/lib/paths2";
import "@/workers/transferHandlers/workspace.th";
import * as Comlink from "comlink";

async function handleMdImageReplace(
  workspace: Workspace,
  origin: string,
  findReplace: [string, string][]
): Promise<AbsPath[]> {
  await workspace.init();
  return !findReplace.length ? [] : await workspace.disk.findReplaceImgBatch(findReplace, origin);
}
export type handleMdImageReplaceType = typeof handleMdImageReplace;
export default Comlink.expose(handleMdImageReplace);
