import { Importer } from "@/data/disk/Disk";
import { DiskFactoryByType } from "@/data/disk/DiskFactory";
import { IndexedDbDisk } from "@/data/disk/IndexedDbDisk";
import { MemDisk } from "@/data/disk/MemDisk";
import { AbortError, isAbortError, isApplicationError, unwrapError } from "@/lib/errors/errors";
import { absPath, isAllowedFileType, stripLeadingSlash } from "@/lib/paths2";
import { ObservableRunner } from "@/services/build/ObservableRunner";
import { WorkspaceDefaultManifest, WorkspaceImportManifestType } from "@/services/import/manifest";
import { Runner } from "@/types/RunnerInterfaces";
import { Workspace } from "@/workspace/Workspace";
import { join } from "path";

export type ImportState = {
  status: "idle" | "success" | "pending" | "error";
  type: "showcase" | "template";
  logs: Array<{
    type: "info" | "error" | "warning" | "success";
    timestamp: number;
    message: string;
  }>;
  confirmImport: ConfirmImportType;
  error: string | null;
};

export type ConfirmImportType = "idle" | "ask" | "yes" | "no";
export abstract class BaseImportRunner<TConfig = any> extends ObservableRunner<ImportState> implements Runner {
  private tmpDisk = DiskFactoryByType(MemDisk.type);
  protected abortController: AbortController = new AbortController();
  protected config: TConfig;

  constructor(config: TConfig) {
    super({
      status: "idle",
      logs: [],
      type: "template",
      error: null,
      confirmImport: "idle",
    });
    this.config = config;
  }

  abstract get ident(): string;
  abstract fetchFiles(signal: AbortSignal): AsyncGenerator<{ path: string; content: () => Promise<Uint8Array> }>;
  // abstract createImportMeta(importManifest: Partial<WorkspaceImportManifestType>): WorkspaceImportManifestType;
  abstract fetchManifest(
    signal: AbortSignal,
    onImportError?: (e: unknown) => void
  ): Promise<WorkspaceImportManifestType>;
  abstract getWorkspaceName(): string;
  abstract preflight(signal: AbortSignal): Promise<{
    abort: boolean;
    reason: string;
    navigate: string | null;
    status: ImportState["status"];
  }>;

  async createWorkspaceImport(
    workspaceName: string,
    ident: string,
    importMeta?: WorkspaceImportManifestType
  ): Promise<Workspace> {
    await this.tmpDisk.superficialIndex();
    const sourceTree = this.tmpDisk.fileTree.toSourceTree();
    const workspace = await Workspace.CreateNew(
      {
        name: workspaceName,
        files: sourceTree.iterator(),
        diskType: IndexedDbDisk.type,
      },
      {
        manifest: importMeta || WorkspaceDefaultManifest(ident),
      }
    );
    return workspace;
  }

  cancel(): void {
    this.abortController.abort(new AbortError("Operation cancelled by user"));
  }

  async run({
    abortSignal,
  }: {
    abortSignal?: AbortSignal;
  } = {}) {
    const allAbortSignal = AbortSignal.any([this.abortController.signal, abortSignal].filter(Boolean));
    try {
      this.target.status = "pending";
      this.target.error = null;

      abortSignal?.throwIfAborted();
      this.log("Starting import...", "info");

      this.log("Preflight...", "info");

      const preflightResult = await this.preflight(allAbortSignal);
      if (preflightResult.abort) {
        this.log(`Import aborted: ${preflightResult.reason}`, "warning");
        this.target.status = preflightResult.status;
        return preflightResult.navigate;
      }

      //check if repo exists and is accessible

      this.log("Fetching manifest...", "info");

      const manifest = await this.fetchManifest(allAbortSignal, (e) => {
        console.error("Error fetching manifest:", unwrapError(e));
      });

      if (manifest.type === "template") {
        this.log("Would you like to import:", "info");
        this.log(this.ident + " ?", "info");

        await this.waitForTemplateConfirmation(allAbortSignal);
      }

      this.log("Fetching files from source...", "info");

      for await (const file of this.fetchFiles(allAbortSignal)) {
        if (!isAllowedFileType(file.path)) {
          this.log(`Skipping file: ${file.path} (unsupported file type)`);
          continue;
        }
        abortSignal?.throwIfAborted();
        await this.tmpDisk.writeFileRecursive(absPath(file.path), await file.content());
        this.log(`Imported file: ${file.path}`, "info");
      }

      this.log("Import completed successfully", "info");

      const workspaceName = this.getWorkspaceName();

      this.log(`Creating workspace ${workspaceName} from imported files...`, "info");

      const workspace = await this.createWorkspaceImport(workspaceName, this.ident, manifest);

      this.log("Workspace created successfully", "success");

      this.target.status = "success";

      return join(workspace.href, manifest.navigate || "");
    } catch (error) {
      if (isAbortError(error)) {
        this.log("Import cancelled by user", "error");
        this.target.error = "Import cancelled by user";
      } else {
        console.error(error);
        const errMsg = isApplicationError(error) ? error.getHint() : unwrapError(error);
        this.log(`Import failed: ${errMsg}`, "error");
        if (isApplicationError(error) && error.code === 404) {
          this.log(`Ensure the resource is publically accessible.`, "error");
        }
        this.target.error = errMsg;
      }
      this.target.status = "error";
      return "/";
    }
  }

  setConfirm(value: ConfirmImportType) {
    this.target.confirmImport = value;
  }
  waitForTemplateConfirmation(signal: AbortSignal) {
    this.target.type = "template";
    this.target.confirmImport = "ask";

    // Use Observable emitter to wait for confirmImport change
    return new Promise<ConfirmImportType>((resolve, reject) => {
      const unsubscribe = this.emitter.on("confirmImport", () => {
        if (this.target.confirmImport !== "ask") {
          unsubscribe();
          resolve(this.target.confirmImport);
        }
      });

      signal.addEventListener("abort", () => {
        unsubscribe();
        reject(signal.reason);
      });
    });
  }
}

export function getIdent(importPath: string) {
  const { owner, repo } = getRepoInfo(importPath);
  return `${owner}/${repo}`;
}

export function getRepoInfo(importPath: string, defaults: { branch?: string } = { branch: "main" }) {
  const [owner, repo, branch, dir = "/"] = stripLeadingSlash(importPath).split("/");
  return {
    owner,
    repo,
    branch: branch || defaults.branch || undefined,
    dir,
  };
}

export interface WorkspaceImport extends Importer {
  fetchManifest(signal: AbortSignal): Promise<WorkspaceImportManifestType>;
}
