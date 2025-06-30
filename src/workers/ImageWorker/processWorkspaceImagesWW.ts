import { Workspace } from "@/Db/Workspace";
import { AbsPath, joinPath } from "@/lib/paths2";
import { wrap } from "comlink";

type ImageWorkerApiType = {
  createImage(workspace: Workspace, filePath: AbsPath, buffer: ArrayBuffer | File): Promise<AbsPath>;
};
/**
 * Processes a collection of image files by uploading them to a target directory within a workspace,
 * utilizing web workers for concurrent processing.
 *
 * @deprecated This function is deprecated and may be removed in future versions.
 *
 * @param {Workspace} workspace - The workspace instance where images will be processed and stored.
 * @param {Iterable<File>} files - An iterable collection of File objects to be processed.
 * @param {AbsPath} targetDir - The absolute path of the target directory where images will be saved.
 * @param {number} [concurrency=window.navigator.hardwareConcurrency ?? 2] - The number of concurrent workers to use for processing.
 * @returns {Promise<AbsPath[]>} A promise that resolves to an array of absolute paths for the processed images.
 */

export async function processWorkspaceImagesWW(
  workspace: Workspace,
  files: Iterable<File>,
  targetDir: AbsPath,
  concurrency = window.navigator.hardwareConcurrency ?? 2
): Promise<AbsPath[]> {
  const results: AbsPath[] = [];
  let index = 0;
  const filesArr = Array.from(files);

  const uploadNext = async () => {
    if (index >= filesArr.length) return;
    const current = index++;
    const file = filesArr[current];
    const worker = new Worker(new URL("@/workers/ImageWorker/image.ww.ts", import.meta.url));
    try {
      const api = wrap<ImageWorkerApiType>(worker);
      const arrayBuffer = await file!.arrayBuffer();
      results[current] = await api.createImage(workspace, joinPath(targetDir, file!.name), arrayBuffer);

      await uploadNext();
    } catch (e) {
      console.error(`Error uploading image ${file?.name}:`, e);
    } finally {
      if (worker) {
        //wait for the worker to finish before terminating
        //terminate the worker
        await new Promise((rs) => setTimeout(rs, 500));
        worker.terminate();
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, filesArr.length) }, () => uploadNext());
  await Promise.all(workers);
  console.log(results);
  await workspace.disk.indexAndEmitNewFiles(results);
  return results;
}
