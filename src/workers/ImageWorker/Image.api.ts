import { type Workspace } from "@/Db/Workspace";
import { AbsPath } from "@/lib/paths2";

export const ImageWorkerApi = {
  async createImage(workspace: Workspace, filePath: AbsPath, buffer: ArrayBuffer | File) {
    return workspace.NewImage(buffer, filePath);
  },
};

export type ImageWorkerApiType = typeof ImageWorkerApi;
