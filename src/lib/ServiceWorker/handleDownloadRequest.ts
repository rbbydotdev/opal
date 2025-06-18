import { coerceUint8Array } from "@/lib/coerceUint8Array";
import { isError, NotFoundError } from "@/lib/errors";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { REQ_SIGNAL } from "@/lib/ServiceWorker/request-signal-types";
import { signalRequest } from "@/lib/ServiceWorker/sw";
import * as fflate from "fflate";
import { SWWStore } from "./SWWStore";

export async function handleDownloadRequest(workspaceId: string): Promise<Response> {
  try {
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

    const workspace = await SWWStore.tryWorkspace(workspaceId);

    await workspace.disk.fileTree.index();
    const fileNodes: TreeNode[] = workspace.disk.fileTree.allNodesArray();

    if (!fileNodes || fileNodes.length === 0) {
      console.warn("No files found in the workspace to download.");
      return new Response("No files to download", { status: 404 });
    }
    let fileCount = fileNodes.filter((node) => node.isTreeFile()).length;

    signalRequest({ type: REQ_SIGNAL.START });
    await Promise.all(
      fileNodes.map(async (node) => {
        if (node.isTreeFile()) {
          try {
            console.log(`Adding file to zip: ${node.path}`);
            const fileStream = new fflate.ZipDeflate(node.path, { level: 9 });
            zip.add(fileStream);
            //'stream' file by file
            void workspace.disk
              .readFile(node.path)
              .then((data) => {
                fileStream.push(coerceUint8Array(data), true);
              })
              .finally(() => {
                fileCount--;
                if (fileCount === 0) {
                  console.log(`All files processed for workspace: ${workspace.name}`);
                  signalRequest({ type: REQ_SIGNAL.END });
                }
              }); // true = last chunk
          } catch (e) {
            console.error(`Failed to add file to zip: ${node.path}`, e);
          }
        } else if (node.type === "dir") {
          const dirName = node.path + "/";
          const emptyDir = new fflate.ZipPassThrough(dirName);
          zip.add(emptyDir);
          emptyDir.push(new Uint8Array(0), true);
        }
      })
    );
    console.log(`All files added to zip for workspace: ${workspace.name}`);

    zip.end();
    console.log(`ZIP stream ended for workspace: ${workspace.name}`);

    return new Response(readable, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${workspace.name}.zip"`,
      },
    });
  } catch (e) {
    if (isError(e, NotFoundError)) {
      return new Response("Error", { status: 404 });
    }
    console.error(`Error in service worker: ${e}`);
    return new Response("Error", { status: 500 });
  }
}
