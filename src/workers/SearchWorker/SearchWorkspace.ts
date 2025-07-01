"use client";
import { type Workspace } from "@/Db/Workspace";
import { SearchWorkerApi, SearchWorkerApiType } from "@/workers/SearchWorker/SearchWorkerApi";
import { Remote, wrap } from "comlink";
import "../transferHandlers";

export class SearchWorkspaceWorker {
  private worker!: Worker;
  private api: Remote<SearchWorkerApiType> | SearchWorkerApiType = SearchWorkerApi;
  constructor(worker?: Worker) {
    try {
      if (typeof Worker === "undefined") return;
      this.worker = worker ?? new Worker(new URL("./search.ww.ts", import.meta.url));
      this.api = wrap<SearchWorkerApiType>(this.worker);
      console.log("search worker ready");
    } catch (error) {
      console.warn("Could not create worker, falling back to direct API calls", error);
    }
  }
  async *searchWorkspace(workspace: Workspace, searchTerm: string) {
    for await (const scan of await this.api.searchWorkspace(workspace, searchTerm)) {
      if (scan.matches.length) {
        yield scan;
      }
    }
  }
  teardown() {
    return this.worker?.terminate?.();
  }
}
