import { Workspace } from "@/Db/Workspace";
import { SearchApiType } from "@/workers/SearchWorker/search.ww";
import { WorkerApi } from "@/workers/SearchWorker/WorkerApi";
import { Remote, wrap } from "comlink";
import "../transferHandlers";

export class SearchWorkspaceWorker {
  private worker!: Worker;
  private api: Remote<SearchApiType> | SearchApiType = WorkerApi;
  constructor() {
    try {
      // throw new Error("Forcing worker creation");
      this.worker = new Worker(new URL("./search.ww.ts", import.meta.url));
      this.api = wrap<SearchApiType>(this.worker);
    } catch (error) {
      console.warn("Could not create worker, falling back to direct API calls", error);
    }
  }
  async *searchWorkspace(workspace: Workspace, searchTerm: string, abortSignal?: AbortSignal) {
    for await (const scan of await this.api.searchWorkspace(workspace, searchTerm, abortSignal)) {
      if (abortSignal?.aborted) {
        console.log("Search aborted in generator 2");
        return;
      }
      console.log("Search result:", scan);
      if (scan.matches.length) {
        yield scan;
      }
    }
  }
  async *searchWorkspaces(workspaces: Workspace[], searchTerm: string) {
    for await (const scan of await this.api.searchWorkspaces(workspaces, searchTerm)) {
      if (scan.matches.length) yield scan;
    }
  }
  teardown() {
    this.worker?.terminate?.();
  }
}
