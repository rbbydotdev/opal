import { type Workspace } from "@/Db/Workspace";
import { AbsPath } from "@/lib/paths2";
import "@/workers/transferHandlers/workspace.th";
import * as Comlink from "comlink";

async function uploadImage(
  workspace: Workspace,
  filePath: AbsPath,
  buffer: ArrayBuffer | File,
  closeOnComplete = true
) {
  try {
    await workspace.NewImage(buffer, filePath);
  } catch (error) {
    console.error("Error in uploadImage:", error);
    throw error;
  } finally {
    await workspace.tearDown();
    if (closeOnComplete) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      self.close();
    }
  }
}

export type CreateImageType = typeof uploadImage;
export default Comlink.expose(uploadImage);
