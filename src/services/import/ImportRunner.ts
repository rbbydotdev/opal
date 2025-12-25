import { CreateSuperTypedEmitter } from "@/lib/events/TypeEmitter";
import { Disk } from "@/data/disk/Disk";
import { GithubImport } from "@/features/workspace-import/WorkspaceImport";
import { relPath, absPath } from "@/lib/paths2";
import { RunnerLogLine, RunnerLogType, createLogLine } from "@/types/RunnerTypes";

export class ImportRunner {
  private disk: Disk;
  private importer: GithubImport;
  private _logs: RunnerLogLine[] = [];
  private _completed: boolean = false;
  private _running: boolean = false;
  private _error: string | null = null;
  private abortController: AbortController = new AbortController();

  emitter = CreateSuperTypedEmitter<{
    log: RunnerLogLine;
    complete: boolean;
    running: boolean;
    update: ImportRunner;
  }>();

  constructor({ disk, fullRepoPath }: { disk: Disk; fullRepoPath: string }) {
    this.disk = disk;
    this.importer = new GithubImport(relPath(fullRepoPath));
  }

  get logs(): RunnerLogLine[] {
    return this._logs;
  }

  get completed(): boolean {
    return this._completed;
  }

  get running(): boolean {
    return this._running;
  }

  get error(): string | null {
    return this._error;
  }

  static create({ disk, fullRepoPath }: { disk: Disk; fullRepoPath: string }): ImportRunner {
    return new ImportRunner({ disk, fullRepoPath });
  }

  onLog = (callback: (log: RunnerLogLine) => void) => {
    return this.emitter.on("log", callback);
  };

  onComplete = (callback: (complete: boolean) => void) => {
    return this.emitter.on("complete", callback);
  };

  onRunning = (callback: (running: boolean) => void) => {
    return this.emitter.on("running", callback);
  };

  onUpdate = (callback: (runner: ImportRunner) => void) => {
    return this.emitter.on("update", callback);
  };

  getRunner = () => this;

  tearDown() {
    this.emitter.clearListeners();
  }


  cancel() {
    this.abortController.abort();
    this.log("Import cancelled by user", "error");
  }

  private log = (message: string, type?: RunnerLogType) => {
    const line = createLogLine(message, type);
    this._logs = [...this._logs, line];
    this.emitter.emit("log", line);
    this.emitter.emit("update", this);
    return line;
  };

  async execute({
    abortSignal = this.abortController.signal,
  }: {
    abortSignal?: AbortSignal;
  } = {}): Promise<void> {
    try {
      this._running = true;
      this._completed = false;
      this._error = null; // Clear any previous errors
      this.emitter.emit("running", true);
      this.emitter.emit("update", this);

      if (abortSignal?.aborted) {
        this.log("Import cancelled", "error");
        return;
      }

      this.log("Starting repository import...", "info");

      for await (const file of this.importer.fetchFiles(abortSignal)) {
        if (abortSignal?.aborted) {
          this.log("Import cancelled", "error");
          return;
        }

        // Write the file to the disk
        await this.disk.writeFile(absPath(file.path), file.content);
        this.log(`Imported file: ${file.path}`, "info");
      }

      this.log("Import completed successfully!", "info");
      this._completed = true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Import failed: ${errorMessage}`, "error");
      this._error = `Import failed: ${errorMessage}`;
      this._completed = true;
    } finally {
      this._running = false;
      this.emitter.emit("complete", this._completed);
      this.emitter.emit("running", false);
      this.emitter.emit("update", this);
    }
  }
}

export class NullImportRunner extends ImportRunner {
  constructor() {
    super({
      disk: {} as Disk,
      fullRepoPath: "",
    });
  }

  async execute(): Promise<void> {
    // Do nothing
  }
}

export const NULL_IMPORT_RUNNER = new NullImportRunner();