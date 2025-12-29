import { NotFoundError } from "@/lib/errors/errors";
import { SWWStore } from "./SWWStore";

export async function handleMdImageReplace(workspaceName: string, findReplace: [string, string][], origin: string) {
  const workspace = await SWWStore.tryWorkspace(workspaceName);
  await workspace.refreshDisk();
  if (!workspace) throw new NotFoundError("Workspace not found");
  return workspace.disk.findReplaceImgBatch(findReplace, origin);
}
