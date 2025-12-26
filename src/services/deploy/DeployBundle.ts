import { Disk } from "@/data/disk/Disk";
import { AbsPath, absPath } from "@/lib/paths2";
import crypto from "crypto";
//
import { FileTree } from "@/components/filetree/Filetree";
import { TreeFile, TreeNode } from "@/components/filetree/TreeNode";
import { BuildDAO, NULL_BUILD } from "@/data/dao/BuildDAO";
import { DestinationDAO, NULL_DESTINATION } from "@/data/dao/DestinationDAO";
import { isGithubDestination } from "@/data/DestinationSchemaMap";
import { archiveTree } from "@/data/disk/archiveTree";
import { TranslateFsTransform } from "@/data/fs/TranslateFs";
import { VirtualWriteFsTransform } from "@/data/fs/VirtualWriteFsTransform";
import { isGithubRemoteAuth } from "@/data/isGithubRemoteAuth";
import { GitPlaybook } from "@/features/git-repo/GitPlaybook";
import { GitRepo } from "@/features/git-repo/GitRepo";
import { ApplicationError, errF } from "@/lib/errors/errors";
import {
  findHtmlFilesInTree,
  updateAbsoluteUrlsInHtmlContent,
  updateFileNodeContents,
} from "@/services/deploy/deployHelpers";
import { RemoteAuthDAO } from "@/workspace/RemoteAuthDAO";
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

export abstract class DeployFileBase<TClientFile> {
  private _content: DeployBundleTreeFileContent | null = null;

  constructor(
    public readonly path: string,
    private contentLoader: () => Promise<DeployBundleTreeFileContent>
  ) {}

  protected async getContent(): Promise<Buffer> {
    if (this._content === null) {
      this._content = await this.contentLoader();
    }
    return Buffer.from(this._content);
  }

  async asBase64(): Promise<string> {
    const content = await this.getContent();
    return content.toString("base64");
  }

  async asUtf8(): Promise<string> {
    const content = await this.getContent();
    return content.toString("utf8");
  }
  async asBuffer(): Promise<Buffer> {
    return await this.getContent();
  }
  async asUint8Array(): Promise<Uint8Array> {
    const content = await this.getContent();
    return new Uint8Array(content) as Uint8Array;
  }
  async asBlob(type: string): Promise<Blob> {
    const content = await this.getContent();
    return new Blob([new Uint8Array(content)], { type });
  }

  async getSHA1(): Promise<string> {
    const content = await this.getContent();
    return crypto.createHash("sha1").update(content).digest("hex");
  }

  abstract asClientFile(): TClientFile | Promise<TClientFile>;
}

export class UniversalDeployFile extends DeployFileBase<Extract<DeployBundleTreeEntry, { type: "file" }>> {
  private encoding: "base64" | "utf-8";

  constructor(
    path: string,
    contentLoader: () => Promise<DeployBundleTreeFileContent>,
    encoding: "base64" | "utf-8" = "base64"
  ) {
    super(path, contentLoader);
    this.encoding = encoding;
  }

  asClientFile(): Extract<DeployBundleTreeEntry, { type: "file" }> {
    return {
      type: "file" as const,
      path: this.path,
      encoding: this.encoding,
      getContent: this.encoding === "base64" ? () => this.asBase64() : () => this.asUtf8(),
    };
  }
}

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

export abstract class DeployBundleBase<TMeta = unknown> {
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

  protected async getDeployFiles(): Promise<UniversalDeployFile[]> {
    await this.disk.refresh();

    // Create a virtual and translated filesystem, this does two things:
    // 1. Translates paths to be relative to the buildDir
    // 2. Captures any writes to the filesystem in-memory (so preDeployAction can modify files without touching disk)

    const translatedVirtualFs = VirtualWriteFsTransform(TranslateFsTransform(this.disk.fs, this.buildDir));

    // Create a new FileTree using the translated filesystem
    const scopedTree = new FileTree(translatedVirtualFs, this.disk.guid, this.disk.mutex);
    await scopedTree.index();

    if (this.preDeployAction) {
      await this.preDeployAction(scopedTree);
      await scopedTree.index(); // Re-index after preDeployAction modifies files
    }

    const files = [...scopedTree.iterator((node: TreeNode) => node.isTreeFile())].map((node) => {
      return new UniversalDeployFile(
        node.path.toString().replace(/^\//, ""), // Remove leading slash for relative path
        async () => await translatedVirtualFs.readFile(node.path)
      );
    });
    return files;
  }

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

  abstract getFiles(): Promise<UniversalDeployFile[]>;
}

export class DeployBundle extends DeployBundleBase {
  // Expose raw file objects for client-specific conversion
  async getFiles(): Promise<UniversalDeployFile[]> {
    return this.getDeployFiles();
  }

  async preDeployAction(tree: FileTree): Promise<void> {
    // GitHub-specific URL rewriting
    if (
      isGithubDestination(this.destination) &&
      this.destination.meta.baseUrl !== "/" &&
      this.destination.meta.baseUrl
    ) {
      for (const node of findHtmlFilesInTree(tree)) {
        const baseUrl = this.destination.meta.baseUrl;
        await updateFileNodeContents(node as TreeFile, (contents) =>
          updateAbsoluteUrlsInHtmlContent(contents, baseUrl)
        );
      }
    }
  }
}

class NullDeployBundle extends DeployBundle {
  constructor() {
    super(NULL_BUILD, NULL_DESTINATION);
  }
}
export const NULL_BUNDLE = new NullDeployBundle();

export function DeployBundleFactory(build: BuildDAO, destination: DestinationDAO): DeployBundle {
  return new DeployBundle(build, destination);
}
