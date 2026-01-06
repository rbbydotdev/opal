import { logger } from "@/lib/service-worker/logger";
import { NotFoundError } from "@/lib/errors/errors";
import { absPath } from "@/lib/paths2";
import { SWWStore } from "./SWWStore";

export async function handleImageUpload(workspaceName: string, filePath: string, arrayBuffer: ArrayBuffer) {
  const workspace = await SWWStore.tryWorkspace(workspaceName);
  const absFilePath = absPath(filePath);
  if (!workspace) throw new NotFoundError(`Workspace not found: ${workspaceName}`);
  logger.log(`Using workspace: ${workspace.name} for image upload to: ${absFilePath}`);
  // Clear image and thumbnail cache before uploading
  try {
    // Clear image cache
    const imageCache = await workspace.imageCache.getCache();
    await imageCache.delete(absFilePath);

    // Clear thumbnail cache (both standard size and possible variations)
    const thumbUrl = absFilePath + "?thumb=100";
    await imageCache.delete(thumbUrl);
  } catch {
    // Silently ignore cache cleanup errors
  }

  return await workspace.NewImage(arrayBuffer, absFilePath);
}
