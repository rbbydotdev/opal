import { Disk } from "@/data/disk/Disk";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, absPath, isStringish, resolveFromRoot } from "@/lib/paths2";
//
import { OPAL_AUTHOR } from "@/app/GitConfig";
import { archiveTree } from "@/data/disk/archiveTree";
import { RemoteAuthDAO } from "@/data/RemoteAuthDAO";
import { GitPlaybook } from "@/features/git-repo/GitPlaybook";
import { GitRepo } from "@/features/git-repo/GitRepo";
import { ApplicationError, errF } from "@/lib/errors";
import { isGithubRemoteAuth } from "../../data/isGithubRemoteAuth";
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

  getDeployBundleFiles = async (rootPath = absPath("/")): Promise<DeployBundleTree> => {
    await this.disk.refresh();
    return Promise.all(
      [...this.disk.fileTree.root.deepCopy().iterator((node: TreeNode) => node.isTreeFile())].map(async (node) =>
        DeployFile({
          path: resolveFromRoot(rootPath, node.path),
          getContent: async () => this.disk.readFile(node.path) as Promise<DeployBundleTreeFileContent>,
          encoding: isStringish(node.path) ? "utf-8" : "base64",
        })
      )
    );
  };

  async deployWithGit({
    ghPagesBranch = "gh-pages",
    remoteAuth,
    buildDir = absPath("/"),
    disk = this.disk,
  }: {
    ghPagesBranch?: string;
    remoteAuth: RemoteAuthDAO;
    buildDir?: AbsPath;
    disk?: Disk;
  }): Promise<void> {
    // const isGithubRemoteAuth
    if (!isGithubRemoteAuth(remoteAuth)) {
      throw new ApplicationError(errF`Only GitHub remote auth is supported for deploy`);
    }
    try {
      const repo = GitRepo.New(disk, `DeployGit/${disk.guid}`, buildDir, ghPagesBranch, OPAL_AUTHOR);
      const playbook = new GitPlaybook(repo);
      await playbook.initialCommit("deploy bundle commit");
      await playbook.push({
        remote: "origin", //need to match remoteRef
        ref: ghPagesBranch,
        force: true,
      });
    } catch (error) {
      //check if network error?
      throw new ApplicationError(errF`Failed to deploy bundle via git: ${error}`);
    }
  }

  async bundleTreeZipStream(buildDir = absPath("/"), disk: Disk = this.disk): Promise<ReadableStream<any>> {
    await disk.refresh();
    return await archiveTree({
      fileTree: disk.fileTree,
      scope: buildDir,
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
