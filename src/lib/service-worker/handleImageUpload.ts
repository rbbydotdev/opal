import { NotFoundError } from "@/lib/errors/errors";
import { AbsPath } from "@/lib/paths2";
import { SWWStore } from "./SWWStore";

export async function handleImageUpload(
  workspaceName: string,
  filePath: AbsPath,
  arrayBuffer: ArrayBuffer
): Promise<string> {
  const workspace = await SWWStore.tryWorkspace(workspaceName);

  if (!workspace) {
    throw new NotFoundError(`Workspace not found: ${workspaceName}`);
  }

  logger.log(`Using workspace: ${workspace.name} for image upload to: ${filePath}`);

  // Clear image and thumbnail cache before uploading
  try {
    // Clear image cache
    const imageCache = await workspace.imageCache.getCache();
    await imageCache.delete(filePath);

    // Clear thumbnail cache (both standard size and possible variations)
    const thumbUrl = filePath + "?thumb=100";
    await imageCache.delete(thumbUrl);
  } catch (e) {
    // Silently ignore cache cleanup errors
  }

  const resultPath = await workspace.NewImage(arrayBuffer, filePath);
  return resultPath;
}
