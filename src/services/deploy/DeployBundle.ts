import { Disk } from "@/data/disk/Disk";
import { AbsPath, absPath, isStringish, resolveFromRoot } from "@/lib/paths2";
//
import { GithubInlinedFile } from "@/api/github/GitHubClient";
import { TreeNode } from "@/components/filetree/TreeNode";
import { archiveTree } from "@/data/disk/archiveTree";
import { isGithubRemoteAuth } from "@/data/isGithubRemoteAuth";
import { GitPlaybook } from "@/features/git-repo/GitPlaybook";
import { GitRepo } from "@/features/git-repo/GitRepo";
import { ApplicationError, errF } from "@/lib/errors/errors";
import { RemoteAuthDAO } from "@/workspace/RemoteAuthDAO";
import { InlinedFile } from "@vercel/sdk/models/createdeploymentop.js";
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

export abstract class DeployBundle<TFile> {
  constructor(
    readonly disk: Disk,
    readonly buildDir = absPath("/")
  ) {}

  protected getDeployBundleFiles = async (): Promise<DeployBundleTreeFileOnly> => {
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

  protected async deployWithGit({
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
    let repo: GitRepo | null = null;
    try {
      repo = GitRepo.GHPagesRepo(disk, this.buildDir, ghPagesBranch);
      const playbook = new GitPlaybook(repo);
      await playbook.initialCommit("deploy bundle commit");
      await playbook.pushRemoteAuth({
        remoteAuth,
        ref: ghPagesBranch,
        force: true,
        url,
      });
    } catch (error) {
      throw new ApplicationError(errF`Failed to deploy bundle via git: ${error}`);
    } finally {
      await repo?.dispose().catch((e) => console.error("Failed to dispose git repo after deploy", e));
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
  abstract getFiles(): Promise<TFile[]>;
}

export class VercelDeployBundle extends DeployBundle<InlinedFile> {
  getFiles = async () => {
    return Promise.all(
      (await this.getDeployBundleFiles()).map(async (file) => ({
        encoding: file.encoding,
        type: file.type,
        file: file.path,
        data: (await file.getContent()).toString(),
      }))
    );
  };
}

export class GithubDeployBundle extends DeployBundle<GithubInlinedFile> {
  getFiles = async () => {
    const files = await this.getDeployBundleFiles();
    return Promise.all(
      files.map(async (file) => ({
        path: file.path,
        content: (await file.getContent()).toString(),
        encoding: file.encoding,
      }))
    );
  };
}
export class AnyDeployBundle extends DeployBundle<DeployBundleTreeEntry> {
  getFiles = this.getDeployBundleFiles;
}
