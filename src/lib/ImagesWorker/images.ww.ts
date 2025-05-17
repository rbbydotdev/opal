// worker.ts
import { Disk, DiskJType } from "@/Db/Disk";
import { createThumbnailWW } from "@/lib/createThumbnailWW";
import { errF } from "@/lib/errors";
import { absPath, AbsPath } from "@/lib/paths";
import * as Comlink from "comlink";

// console.log = function (msg: string) {
//   RemoteLogger(msg, "log");
// };

// console.debug = function (msg: string) {
//   RemoteLogger(msg, "debug");
// };
// console.error = function (msg: string) {
//   RemoteLogger(msg, "error");
// };
// console.warn = function (msg: string) {
//   RemoteLogger(msg, "warn");
// };

// Define the API that the worker will expose
const workerApi = {
  // createThumbnail: async (imageData: Uint8Array, maxWidth: number, maxHeight: number) => {
  //   return createThumbnailWW(imageData, maxWidth, maxHeight);
  // },
  thumbnailForWorkspace: async ({
    content,
    path,
    size,
    thumbStore,
  }: {
    content: Uint8Array;
    path: string;
    size: number;
    thumbStore: DiskJType;
  }) => {
    // Simulate a thumbnail creation process
    try {
      const thumbPic = await createThumbnailWW(content, size, size);

      const disk = Disk.fromJSON(thumbStore).toModel();
      await disk.ready;

      await disk.writeFileRecursive(absPath(path), thumbPic);
      console.log(`"Thumbnail created at path: ${absPath(path)}"`);
    } catch (e) {
      console.error(errF`"Error creating thumbnail, size: {${content.length}}, type: {${typeof content}} error: ${e}"`);
      throw e;
    }

    // const { guid } = await Thumbnail.create(workspaceId, path, thumbNail);
    // return guid;
  },
};
export type ImageWorkerApiType = typeof workerApi;

// Expose the API via Comlink
Comlink.expose(workerApi);
