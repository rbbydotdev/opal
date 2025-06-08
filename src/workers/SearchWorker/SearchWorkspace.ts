import { Workspace } from "@/Db/Workspace";
import { errF } from "@/lib/errors";
import { SearchApiType } from "@/workers/SearchWorker/search.ww";
import { Remote, wrap } from "comlink";
import "../transferHandlers";

export class SearchWorkspaceWorker {
  private worker!: Worker;
  private api!: Remote<SearchApiType> | SearchApiType;
  constructor() {
    try {
      this.worker = new Worker(new URL("./search.ww.ts", import.meta.url));
      this.api = wrap<SearchApiType>(this.worker);
    } catch (error) {
      console.warn("Could not create worker, falling back to direct API calls", error);
      this.api = {
        async *searchWorkspace(workspace: Workspace, searchStr: string) {
          yield* workspace.NewScannable().search(searchStr);
        },
      };
    }
  }
  async *searchWorkspace(workspace: Workspace, searchTerm: string) {
    for await (const scan of await this.api.searchWorkspace(workspace, searchTerm)) {
      if (scan.results.length) yield scan;
    }
  }
  teardown() {
    this.worker?.terminate?.();
  }
}
