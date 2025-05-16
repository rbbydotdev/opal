// worker.ts
import { Thumbnail } from "@/Db/Thumbnails";
import { createThumbnailWW } from "@/lib/createThumbnailWW";
import { AbsPath } from "@/lib/paths";
import * as Comlink from "comlink";

// Define the API that the worker will expose
const workerApi = {
  createThumbnail: async (imageData: Uint8Array, maxWidth: number, maxHeight: number) => {
    return createThumbnailWW(imageData, maxWidth, maxHeight);
  },
  thumbnailForWorkspace: async ({
    content,
    workspaceId,
    path,
    size,
  }: {
    content: Uint8Array;
    workspaceId: string;
    path: AbsPath;
    size: number;
  }) => {
    // Simulate a thumbnail creation process
    const thumbNail = await createThumbnailWW(content, size, size);
    return (await Thumbnail.create(workspaceId, path, thumbNail)).guid;
  },
};
export type ImageWorkerApiType = typeof workerApi;

// Expose the API via Comlink
Comlink.expose(workerApi);
