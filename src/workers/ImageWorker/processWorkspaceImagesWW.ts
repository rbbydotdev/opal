import { Workspace } from "@/Db/Workspace";
import { AbsPath, joinPath } from "@/lib/paths2";
import { wrap } from "comlink";

type ImageWorkerApiType = {
  createImage(workspace: Workspace, filePath: AbsPath, buffer: ArrayBuffer | File): Promise<AbsPath>;
};

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
