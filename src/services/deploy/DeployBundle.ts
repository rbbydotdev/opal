import { Disk } from "@/data/disk/Disk";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { absPath, isStringish, resolveFromRoot } from "@/lib/paths2";
//
import { archiveTree } from "@/data/disk/archiveTree";
import { ApplicationError, errF } from "@/lib/errors";
//

type DeployBundleTreeFileContent = string | Uint8Array<ArrayBufferLike> | Buffer<ArrayBufferLike>;
type DeployBundleTreeEntry =
  | {
      path: string;
      getContent: () => Promise<DeployBundleTreeFileContent>;
      encoding: "utf-8" | "base64";
      type: "file";
    }
  | {
      path: string;
      type: "dir";
    };

function DeployFile(file: Omit<Extract<DeployBundleTreeEntry, { type: "file" }>, "type">) {
  return {
    ...file,
    type: "file" as const,
  };
}
function DeployDir(dir: Omit<Extract<DeployBundleTreeEntry, { type: "dir" }>, "type">) {
  return {
    ...dir,
    type: "dir" as const,
  };
}
const isDeployBundleTreeFileEntry = (
  entry: DeployBundleTreeEntry
): entry is Extract<DeployBundleTreeEntry, { type: "file" }> => {
  return (entry as any).type === "file";
};
const isDeployBundleTreeDirEntry = (
  entry: DeployBundleTreeEntry
): entry is Extract<DeployBundleTreeEntry, { type: "dir" }> => {
  return (entry as any).type === "dir";
};

type DeployBundleTree = DeployBundleTreeEntry[];

export class DeployBundle {
  constructor(readonly disk: Disk) {}

  getDeployBundleTree = async (): Promise<DeployBundleTree> => {
    await this.disk.refresh();
    return Promise.all(
      [...this.disk.fileTree.root.deepCopy().iterator((node: TreeNode) => node.isTreeFile())].map(async (node) =>
        DeployFile({
          path: resolveFromRoot(absPath("/this.buildPath.or.something"), node.path),
          getContent: async () => this.disk.readFile(node.path) as Promise<DeployBundleTreeFileContent>,
          encoding: isStringish(node.path) ? "utf-8" : "base64",
        })
      )
    );
  };

  async bundleTreeZipStream(disk: Disk = this.disk): Promise<ReadableStream<any>> {
    await disk.refresh();
    return await archiveTree({
      fileTree: disk.fileTree,
      prefixPath: absPath("/bundle"),
      onFileError: (error, filePath) => {
        throw new ApplicationError(errF`Failed to add file to zip: ${filePath} ${error}`);
      },
      onFileProcessed: (filePath, fileCount, total) => {
        console.debug(`Processed file: ${filePath}. Remaining: ${fileCount}/${total}`);
        if (fileCount === 0) {
          console.debug(`All files processed`);
        }
      },
    });
  }
}
