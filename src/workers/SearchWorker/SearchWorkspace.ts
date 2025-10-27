import { type Workspace } from "@/data/Workspace";
import { SearchMode, SearchWorkerApi, SearchWorkerApiType } from "@/workers/SearchWorker/search.api";
import { Remote, wrap } from "comlink";
import "../transferHandlers/asyncGenerator.th";

export class SearchWorkspaceWorker {
  private worker!: Worker;
  private api: Remote<SearchWorkerApiType> | SearchWorkerApiType = SearchWorkerApi;
  constructor(worker?: Worker) {
    try {
      if (typeof Worker === "undefined") return;
      this.worker =
        worker ?? new Worker(new URL("/src/workers/SearchWorker/search.ww.ts", import.meta.url), { type: "module" });
      this.api = wrap<SearchWorkerApiType>(this.worker);
      console.log("search worker ready");
    } catch (error) {
      console.warn("Could not create worker, falling back to direct API calls", error);
    }
  }
  async *searchWorkspace(workspace: Workspace, searchTerm: string, mode: SearchMode = "content") {
    for await (const scan of await this.api.searchWorkspace(workspace, searchTerm, mode)) {
      if (scan.matches.length) {
        yield scan;
      }
    }
  }
  async *searchWorkspaces(workspaces: Workspace[], searchTerm: string, mode: SearchMode = "content") {
    for await (const scan of await this.api.searchWorkspaces(workspaces, searchTerm, mode)) {
      if (scan.matches.length) {
        yield scan;
      }
    }
  }
  teardown() {
    return this.worker?.terminate?.();
  }
}
