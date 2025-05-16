import { newImagesWorkerInstance } from "@/components/SWImages";
import { AbsPath } from "@/lib/paths";

//avoiding circular dependency for now
export async function thumbnailFromImage(workspaceId: string, path: AbsPath, content: Uint8Array, size = 10) {
  const thumbWw = newImagesWorkerInstance();
  const thumbGuid = await thumbWw.api.thumbnailForWorkspace({
    workspaceId,
    path,
    content,
    size,
  });
  return thumbGuid;
}
