import { Disk } from "@/data/disk/Disk";
import { AbsPath, absPath, isStringish, resolveFromRoot } from "@/lib/paths2";
//
import { TreeNode } from "@/components/filetree/TreeNode";
import { BuildDAO } from "@/data/dao/BuildDAO";
import { archiveTree } from "@/data/disk/archiveTree";
import { isGithubRemoteAuth } from "@/data/isGithubRemoteAuth";
import { GitPlaybook } from "@/features/git-repo/GitPlaybook";
import { GitRepo } from "@/features/git-repo/GitRepo";
import { ApplicationError, errF } from "@/lib/errors/errors";
import { RemoteAuthDAO } from "@/workspace/RemoteAuthDAO";
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
export type DeployBundleTreeFileOnly = Extract<DeployBundleTreeEntry, { type: "file" }>[];

export class DeployBundle {
  constructor(
    readonly disk: Disk,
    readonly buildDir = absPath("/")
  ) {}

  static FromBuild(build: BuildDAO) {
    return new DeployBundle(build.getSourceDisk(), build.getBuildPath());
  }

  getDeployBundleFiles = async (): Promise<DeployBundleTreeFileOnly> => {
    await this.disk.refresh();
    return Promise.all(
      [...this.disk.fileTree.root.deepCopy().iterator((node: TreeNode) => node.isTreeFile())].map(async (node) =>
        DeployFile({
          path: resolveFromRoot(this.buildDir, node.path),
          getContent: async () => this.disk.readFile(node.path) as Promise<DeployBundleTreeFileContent>,
          encoding: isStringish(node.path) ? "utf-8" : "base64",
        })
      )
    );
  };

  async deployWithGit({
    ghPagesBranch = "gh-pages",
    remoteAuth,
    disk = this.disk,
    url,
  }: {
    ghPagesBranch?: string;
    remoteAuth: RemoteAuthDAO;
    url: string;
    buildDir?: AbsPath;
    disk?: Disk;
  }): Promise<void> {
    if (!isGithubRemoteAuth(remoteAuth)) {
      throw new ApplicationError(errF`Only GitHub remote auth is supported for deploy`);
    }
    try {
      const playbook = new GitPlaybook(GitRepo.GHPagesRepo(disk, this.buildDir, ghPagesBranch));
      await playbook.initialCommit("deploy bundle commit");
      await playbook.pushRemoteAuth({
        remoteAuth,
        ref: ghPagesBranch,
        force: true,
        url,
      });
    } catch (error) {
      throw new ApplicationError(errF`Failed to deploy bundle via git: ${error}`);
    }
  }

  async bundleTreeZipStream(disk: Disk = this.disk): Promise<ReadableStream<any>> {
    await disk.refresh();
    return await archiveTree({
      fileTree: disk.fileTree,
      scope: this.buildDir,
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
