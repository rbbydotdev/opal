import { Disk } from "@/data/disk/Disk";
import { AbsPath, absPath } from "@/lib/paths2";
//
import { GithubInlinedFile } from "@/api/github/GitHubClient";
import { FileTree } from "@/components/filetree/Filetree";
import { TreeFile, TreeNode } from "@/components/filetree/TreeNode";
import { BuildDAO } from "@/data/dao/BuildDAO";
import { DestinationDAO } from "@/data/dao/DestinationDAO";
import { GithubDestinationMeta, isGithubDestination } from "@/data/DestinationSchemaMap";
import { archiveTree } from "@/data/disk/archiveTree";
import { TranslateFs } from "@/data/fs/TranslateFs";
import { isGithubRemoteAuth } from "@/data/isGithubRemoteAuth";
import { GitPlaybook } from "@/features/git-repo/GitPlaybook";
import { GitRepo } from "@/features/git-repo/GitRepo";
import { ApplicationError, errF } from "@/lib/errors/errors";
import { RemoteAuthDAO } from "@/workspace/RemoteAuthDAO";
import { InlinedFile } from "@vercel/sdk/models/createdeploymentop.js";
//

type DeployBundleTreeFileContent = string | Uint8Array<ArrayBufferLike> | Buffer<ArrayBufferLike>;
export type DeployBundleTreeEntry =
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

export type DeployBundleTreeFileOnly = Extract<DeployBundleTreeEntry, { type: "file" }>;

export abstract class DeployBundle<TFile, TMeta = unknown> {
  readonly disk: Disk;
  readonly buildDir = absPath("/");

  constructor(
    build: BuildDAO,
    public readonly destination: DestinationDAO<TMeta>
  ) {
    this.disk = build.Disk;
    this.buildDir = build.getOutputPath();
  }

  preDeployAction?(tree: FileTree): Promise<void> {
    return Promise.resolve();
  }

  protected getDeployBundleFiles = async (): Promise<DeployBundleTreeFileOnly[]> => {
    await this.disk.refresh();

    // Create a translated filesystem that maps virtual paths to the build directory
    const translatedFs = new TranslateFs(this.disk.fs, this.buildDir);

    // Create a new FileTree using the translated filesystem
    const scopedTree = new FileTree(translatedFs, this.disk.guid, this.disk.mutex);
    await scopedTree.index();

    if (this.preDeployAction) {
      await this.preDeployAction(scopedTree);
      await scopedTree.index(); // Re-index after preDeployAction modifies files
    }

    const files = await Promise.all(
      [...scopedTree.iterator((node: TreeNode) => node.isTreeFile())].map(async (node) => {
        const file = DeployFile({
          path: node.path.toString().replace(/^\//, ""), // Remove leading slash for relative path
          getContent: async () => Buffer.from(await translatedFs.readFile(node.path)).toString("base64"),
          encoding: "base64", // Always use base64 encoding
        });
        console.log("Created file:", file.path, "getContent type:", typeof file.getContent);
        return file;
      })
    );
    console.log("All files created, count:", files.length);
    return files;
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
      await repo?.dispose().catch((e) => logger.error("Failed to dispose git repo after deploy", e));
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
        logger.debug(`Processed file: ${filePath}. Remaining: ${fileCount}/${total}`);
        if (fileCount === 0) {
          logger.debug(`All files processed`);
        }
      },
    });
  }
  abstract getFiles(): Promise<TFile[]>;
}

export class VercelDeployBundle extends DeployBundle<InlinedFile> {
  getFiles = async () => {
    console.log("VercelDeployBundle.getFiles: Converting to InlinedFile format");
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

export class GithubDeployBundle extends DeployBundle<GithubInlinedFile, GithubDestinationMeta> {
  getFiles = this.getDeployBundleFiles;
  async preDeployAction(tree: FileTree): Promise<void> {
    for (const node of findHtmlFilesInTree(tree)) {
      await updateFileNodeContents(node as TreeFile, (contents) => {
        return addBaseTagToHtmlContent(contents, this.destination.meta.baseUrl || "/");
      });
    }
  }
}

function addBaseTagToHtmlContent(content: string, baseUrl: string): string {
  if (content.includes("<base ")) {
    return content; // Base tag already exists
  }
  return content.replace(/<head>/, `<head>\n<base href="${baseUrl}">\n`);
}
function updateFileNodeContents(node: TreeFile, cb: (contents: string) => string): Promise<void> {
  return node.read().then((data) => {
    const updatedContent = cb(data.toString());
    return node.write(updatedContent);
  });
}
function findHtmlFilesInTree(tree: FileTree): TreeNode[] {
  const htmlFiles: TreeNode[] = [];
  for (const node of tree.iterator()) {
    if (node.isTreeFile() && node.path.endsWith(".html")) {
      htmlFiles.push(node);
    }
  }
  return htmlFiles;
}

export class AnyDeployBundle extends DeployBundle<DeployBundleTreeEntry> {
  getFiles = this.getDeployBundleFiles;
}

export function DeployBundleFactory(
  build: BuildDAO,
  destination: DestinationDAO
): DeployBundle<InlinedFile | GithubInlinedFile | DeployBundleTreeEntry> {
  if (isGithubDestination(destination)) {
    return new GithubDeployBundle(build, destination);
  }
  if (destination.remoteAuth.source === "vercel") {
    return new VercelDeployBundle(build, destination);
  } else {
    return new AnyDeployBundle(build, destination);
  }
}
