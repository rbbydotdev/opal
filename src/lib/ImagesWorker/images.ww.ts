// worker.ts
import { Disk, DiskJType } from "@/Db/Disk";
import { createThumbnailWW } from "@/lib/createThumbnailWW";
import { errF } from "@/lib/errors";
import { absPath } from "@/lib/paths2";
import * as Comlink from "comlink";
const workerApi = {
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
      // await new Promise((rs) => setTimeout(rs, 5_000));
      const thumbPic = await createThumbnailWW(content, size, size);
      const thumbDisk = Disk.fromJSON(thumbStore).toModel();
      await thumbDisk.ready;
      await thumbDisk.writeFileRecursive(absPath(path), thumbPic);
      console.log(
        `${typeof WorkerGlobalScope !== "undefined" && "webworker:"} Thumbnail created at path: ${absPath(path)}"`
      );
    } catch (e) {
      console.error(errF`"Error creating thumbnail, size: {${content.length}}, type: {${typeof content}} error: ${e}"`);
      throw e;
    }
  },
};
export type ImageWorkerApiType = typeof workerApi;

// Expose the API via Comlink
Comlink.expose(workerApi);
