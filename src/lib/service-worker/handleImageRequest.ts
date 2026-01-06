import { logger } from "@/lib/service-worker/logger";
import { coerceUint8Array } from "@/lib/coerceUint8Array";
import { NotFoundError } from "@/lib/errors/errors";
import { getMimeType } from "@/lib/mimeType";
import { absPath } from "@/lib/paths2";
import { SWWStore } from "./SWWStore";

export interface ImageResult {
  contents: Uint8Array;
  mimeType: string;
  pathname: string;
}

export async function handleImageRequest(
  pathname: string,
  workspaceName: string,
  isThumbnail?: boolean
): Promise<ImageResult> {
  const workspace = await SWWStore.tryWorkspace(workspaceName);

  if (!workspace) {
    throw new NotFoundError(`Workspace not found: ${workspaceName}`);
  }

  logger.log(`Using workspace: ${workspace.name} for image request: ${pathname}`);

  // Determine if this is a thumbnail request if not provided
  const isThumb = isThumbnail ?? pathname.includes("?thumb=");

  const contents = await (isThumb && !pathname.startsWith("/.thumb/")
    ? workspace.readOrMakeThumb(absPath(pathname))
    : workspace.readFile(absPath(pathname)));

  return {
    contents: coerceUint8Array(contents),
    mimeType: getMimeType(pathname),
    pathname,
  };
}
