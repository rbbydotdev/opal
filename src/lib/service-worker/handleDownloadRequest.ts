import { TreeNode } from "@/components/SidebarFileMenu/FileTree/TreeNode";
import { FilterOutSpecialDirs } from "@/data/SpecialDirs";
import { coerceUint8Array } from "@/lib/coerceUint8Array";
import { isError, NotFoundError } from "@/lib/errors";
import { absPath, joinPath, strictPathname } from "@/lib/paths2";
import { REQ_SIGNAL } from "@/lib/service-worker/request-signal-types";
import { signalRequest } from "@/lib/service-worker/utils";
import * as fflate from "fflate";
import { SWWStore } from "./SWWStore";

export async function handleDownloadRequest(workspaceName: string): Promise<Response> {
  try {
    const workspaceDirName = absPath(strictPathname(workspaceName));
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

    const workspace = await SWWStore.tryWorkspace(workspaceName);

    await workspace.getDisk().fileTree.index();

    const fileNodes = [...workspace.getDisk().fileTree.iterator(FilterOutSpecialDirs)] as TreeNode[];

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
            const fileStream = new fflate.ZipDeflate(joinPath(workspaceDirName, node.path), { level: 9 });
            zip.add(fileStream);
            //'stream' file by file
            void workspace
              .getDisk()
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
          const emptyDir = new fflate.ZipPassThrough(joinPath(workspaceDirName, node.path) + "/");
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
