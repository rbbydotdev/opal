import { Disk } from "@/data/disk/Disk";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { absPath, addTrailingSlash, isStringish, joinPath, resolveFromRoot } from "@/lib/paths2";
//
import { FilterOutSpecialDirs } from "@/data/SpecialDirs";
import { coerceUint8Array } from "@/lib/coerceUint8Array";
import { ApplicationError, errF, NotFoundError } from "@/lib/errors";
import { FileTree } from "@/lib/FileTree/Filetree";
import * as fflate from "fflate";
//

type DeployBundleTreeFileContent = string | Uint8Array<ArrayBufferLike> | Buffer<ArrayBufferLike>;
type DeployBundleTreeEntry = {
  path: string;
  getContent: () => Promise<DeployBundleTreeFileContent>;
  encoding: "utf-8" | "base64";
};
type DeployBundleTree = DeployBundleTreeEntry[];

export class DeployBundle {
  constructor(readonly disk: Disk) {}

  getDeployBundleTree = async (): Promise<DeployBundleTree> => {
    await this.disk.refresh();
    return Promise.all(
      [...this.disk.fileTree.root.deepCopy().iterator((node: TreeNode) => node.isTreeFile())].map(async (node) => ({
        path: resolveFromRoot(absPath("/this.buildPath.or.something"), node.path),
        getContent: async () => this.disk.readFile(node.path) as Promise<DeployBundleTreeFileContent>,
        encoding: isStringish(node.path) ? "utf-8" : "base64",
      }))
    );
  };

  async bundleTreeZipStream(disk: Disk = this.disk): Promise<ReadableStream<any>> {
    await disk.refresh();
    const fileTree: FileTree = disk.fileTree;
    const prefixPath = absPath("/bundle");
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

    const allFiles = [...fileTree.iterator(FilterOutSpecialDirs)];
    let fileCount = allFiles.filter((node) => node.isTreeFile()).length;
    if (fileCount === 0) {
      throw new NotFoundError("No files to bundle");
    }
    for (const node of allFiles) {
      if (node.isTreeFile()) {
        try {
          const fileStream = new fflate.ZipDeflate(addTrailingSlash(joinPath(prefixPath, node.path)), { level: 9 });
          zip.add(fileStream);
          //'stream' file by file
          void this.disk
            .readFile(node.path)
            .then((data) => {
              fileStream.push(coerceUint8Array(data), true);
            })
            .finally(() => {
              fileCount--;
              if (fileCount === 0) {
                //finished
              }
            }); // true = last chunk
        } catch (e) {
          throw new ApplicationError(errF`Failed to add file to zip: ${node.path} ${e}`);
        }
      } else if (node.type === "dir") {
        const emptyDir = new fflate.ZipPassThrough(addTrailingSlash(joinPath(prefixPath, node.path)));
        zip.add(emptyDir);
        emptyDir.push(new Uint8Array(0), true);
      }
    }

    zip.end();

    return readable;
  }
}
