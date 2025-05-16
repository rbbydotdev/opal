import { ImagesWorker } from "@/lib/ImagesWorker/instance";
import { AbsPath } from "@/lib/paths";

//avoiding circular dependency for now
export async function thumbnailFromImage(workspaceId: string, path: AbsPath, content: Uint8Array, size = 50) {
  const thumbGuid = await ImagesWorker.api.thumbnailForWorkspace({
    workspaceId,
    path,
    content,
    size,
  });
  return thumbGuid;
}
