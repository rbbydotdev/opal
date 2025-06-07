import { Workspace } from "@/Db/Workspace";
import { SearchApiType } from "@/workers/SearchWorker/search.ww";
import { Remote, wrap } from "comlink";
import "../transferHandlers";

export class SearchWorkspaceWorker {
  private worker: Worker;
  private api: Remote<SearchApiType>;
  constructor() {
    this.worker = new Worker(new URL("./search.ww.ts", import.meta.url));
    this.api = wrap<SearchApiType>(this.worker);
  }
  async *searchWorkspace(workspace: Workspace, searchTerm: string) {
    for await (const scan of await this.api.searchWorkspace(workspace, searchTerm)) {
      if (scan.results.length) yield scan;
    }
  }
  teardown() {
    this.worker.terminate();
  }
}
