import { FileTree } from "@/components/filetree/Filetree";
import { TreeNode } from "@/components/filetree/TreeNode";
import { DiskDAO } from "@/data/disk/DiskDAO";
import { DiskFromJSON } from "@/data/disk/DiskFactory";
import { TranslateFsTransform } from "@/data/fs/TranslateFs";
import { FilterOutSpecialDirs } from "@/data/SpecialDirs";
import { coerceUint8Array } from "@/lib/coerceUint8Array";
import { errF, isError, NotFoundError, unwrapError } from "@/lib/errors/errors";
import { absPath, joinPath, strictPathname } from "@/lib/paths2";
import { downloadZipSchema } from "@/lib/service-worker/downloadZipURL";
import { REQ_SIGNAL } from "@/lib/service-worker/request-signal-types";
import { signalRequest } from "@/lib/service-worker/utils";
import * as fflate from "fflate";
import z from "zod";
import { SWWStore } from "./SWWStore";

export async function handleDownloadRequest({
  workspaceName,
  ...params
}: z.infer<typeof downloadZipSchema>): Promise<Response> {
  try {
    const disk =
      params.type === "workspace"
        ? (await SWWStore.tryWorkspace(workspaceName!)).disk
        : DiskFromJSON(await DiskDAO.FetchFromGuidOrThrow(params.diskId));

    await disk.init({ skipListeners: true });
    await disk.refresh();

    const workspaceDirName = absPath(strictPathname(workspaceName!));
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Set up the ZIP stream
    const zip = new fflate.Zip(async (err, data, final) => {
      if (err) {
        await writer.abort(err);
        return;
      }
      await writer.write(data);
      if (final) await writer.close();
    });

    // Create a translated filesystem that maps virtual paths to the actual directory
    const translatedFs = TranslateFsTransform(disk.fs, params.dir);

    // Create a new FileTree using the translated filesystem
    const scopedTree = new FileTree(translatedFs, disk.guid, disk.mutex);
    await scopedTree.index();

    const fileNodes = [
      ...scopedTree.iterator(params.type === "workspace" ? FilterOutSpecialDirs : undefined),
    ] as TreeNode[];

    if (!fileNodes || fileNodes.length === 0) {
      logger.warn("No files found in the workspace to download.");
      return new Response("No files to download", { status: 404 });
    }
    let fileCount = fileNodes.filter((node) => node.isTreeFile()).length;

    signalRequest({ type: REQ_SIGNAL.START });
    await Promise.all(
      fileNodes.map(async (node) => {
        if (node.isTreeFile()) {
          try {
            logger.log(`Adding file to zip: ${node.path}`);
            const fileStream = new fflate.ZipDeflate(joinPath(workspaceDirName, node.path), { level: 9 });
            zip.add(fileStream);
            //'stream' file by file
            void node
              .read()
              .then((data) => fileStream.push(coerceUint8Array(data), true))
              .finally(() => {
                fileCount--;
                if (fileCount === 0) {
                  logger.log(`All files processed for workspace: ${workspaceName}`);
                  signalRequest({ type: REQ_SIGNAL.END });
                }
              }); // true = last chunk
          } catch (e) {
            logger.error(`Failed to add file to zip: ${node.path}`, e);
          }
        } else if (node.type === "dir") {
          const emptyDir = new fflate.ZipPassThrough(joinPath(workspaceDirName, node.path) + "/");
          zip.add(emptyDir);
          emptyDir.push(new Uint8Array(0), true);
        }
      })
    );
    logger.log(`All files added to zip for workspace: ${workspaceName}`);

    zip.end();
    logger.log(`ZIP stream ended for workspace: ${workspaceName}`);

    return new Response(readable, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${workspaceName}.zip"`,
      },
    });
  } catch (e) {
    if (isError(e, NotFoundError)) {
      return new Response(unwrapError(e), { status: 404 });
    }
    logger.error(errF`Error in service worker: ${e}`);
    return new Response(unwrapError(e), { status: 500 });
  }
}
