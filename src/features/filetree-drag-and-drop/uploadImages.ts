import { type Workspace } from "@/Db/Workspace";
import { AbsPath, joinPath } from "@/lib/paths2";
import { type ImageWorkerApiType } from "@/workers/ImageWorker/Image.api";
import { ImageWorkerMessageArgs, ImageWorkerMessageReturn } from "@/workers/ImageWorker/image3.ww";
import "@/workers/transferHandlers/asyncGenerator.th";
import { wrap } from "comlink";

export async function uploadImages3(
  workspace: Workspace,
  files: File[],
  targetDir: AbsPath
): Promise<(AbsPath | null)[]> {
  return Promise.all(
    files.map(async (file) => {
      const worker = new Worker(new URL("@/workers/ImageWorker/image3.ww.ts", import.meta.url));
      const buffer = await file.arrayBuffer();
      worker.postMessage(
        {
          workspace: workspace.toJSON(),
          filePath: joinPath(targetDir, file.name),
          buffer,
        } as ImageWorkerMessageArgs,
        [buffer]
      ); // Transfer the file object to the worker
      return new Promise<AbsPath | null>((resolve) => {
        worker.onmessage = (event: MessageEvent<ImageWorkerMessageReturn>) => {
          const { path, error } = event.data;
          if (error || path === null) {
            console.error("Error uploading image:", error);
            resolve(null);
          } else {
            console.log("file uploaded to ww", path);
            resolve(path);
          }
        };
      });
    })
  );
}

export async function uploadImages2(
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

export async function uploadImages(
  currentWorkspace: Workspace,
  files: Iterable<File>,
  targetDir: AbsPath,
  concurrency = window.navigator.hardwareConcurrency ?? 2
): Promise<AbsPath[]> {
  const filesArr = Array.from(files);
  const results: AbsPath[] = new Array(filesArr.length);
  const queue = filesArr.map((file, idx) => ({ file, idx }));

  async function workerTask() {
    const worker = new Worker(new URL("@/workers/ImageWorker/image.ww.ts", import.meta.url));
    const api = wrap<ImageWorkerApiType>(worker);

    try {
      while (queue.length > 0) {
        const { file, idx } = queue.pop()!;
        const arrayBuffer = await file.arrayBuffer();
        results[idx] = await api.createImage(currentWorkspace, joinPath(targetDir, file.name), arrayBuffer);
      }
    } catch (e) {
      console.error(`Error uploading image:`, e);
    }
    worker.terminate();
  }

  const poolSize = Math.min(concurrency, filesArr.length);
  const pool = Array.from({ length: poolSize }, () => workerTask());
  await Promise.all(pool);

  await currentWorkspace.disk.indexAndEmitNewFiles(results);
  return results;
}
