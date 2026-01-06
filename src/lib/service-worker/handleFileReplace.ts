import { NotFoundError } from "@/lib/errors/errors";
import { SWWStore } from "./SWWStore";

export async function handleFileReplace(url: URL, workspaceName: string, findReplace: [string, string][]) {
  const workspace = await SWWStore.tryWorkspace(workspaceName);
  if (!workspace) throw new NotFoundError(`Workspace not found: ${workspaceName}`);
  await workspace.refreshDisk();
  return !findReplace.length ? [] : await workspace.disk.findReplaceFileBatch(findReplace, url.origin);
}
