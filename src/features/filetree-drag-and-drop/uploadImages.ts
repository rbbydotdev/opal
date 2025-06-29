import { type Workspace } from "@/Db/Workspace";
import { AbsPath, joinPath } from "@/lib/paths2";
import { type ImageWorkerApiType } from "@/workers/ImageWorker/ImageWorkerApi";
import { wrap } from "comlink";

export async function uploadImages(
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
        await new Promise((rs) => (worker.onmessage = rs));
        console.log("terminate worker");
        worker.terminate();
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, filesArr.length) }, () => uploadNext());
  await Promise.all(workers);
  await workspace.disk.indexAndEmitNewFiles(results);
  return results;
}

export async function uploadSingleImage(currentWorkspace: Workspace, file: File, targetDir: AbsPath) {
  return (await uploadImages(currentWorkspace, [file], targetDir))[0]!;
}
