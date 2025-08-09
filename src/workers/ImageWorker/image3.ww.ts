/// <reference lib="webworker" />

// async createImage(workspace: Workspace, filePath: AbsPath, buffer: ArrayBuffer | File) {
//   return workspace.NewImage(buffer, filePath);
// },

import { Workspace, WorkspaceJType } from "@/Db/Workspace";
import { unwrapError } from "@/lib/errors";
import { AbsPath } from "@/lib/paths2";
import { ImageWorkerApi } from "@/workers/ImageWorker/Image.api";

//
self.onmessage = function (event: MessageEvent<ImageWorkerMessageArgs>) {
  void (async () => {
    const { workspace: ws, filePath, buffer } = event.data;

    const workspace = Workspace.FromJSON(ws);
    try {
      const result = await ImageWorkerApi.createImage(workspace, filePath, buffer);
      self.postMessage({ path: result, error: null });
    } catch (error) {
      self.postMessage({ path: null, error: unwrapError(error) });
    }
  })();
};

export type ImageWorkerMessageArgs = {
  workspace: WorkspaceJType;
  filePath: AbsPath;
  buffer: ArrayBuffer | File;
};

export type ImageWorkerMessageReturn =
  | {
      path: AbsPath;
      error: null;
    }
  | {
      path: null;
      error: string;
    };
