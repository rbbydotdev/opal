"use client";
import { Workspace } from "@/Db/Workspace";
import { SearchApiType } from "@/workers/SearchWorker/search.ww";
import { WorkerApi } from "@/workers/SearchWorker/WorkerApi";
import { Remote, wrap } from "comlink";
import "../transferHandlers";

export class SearchWorkspaceWorker {
  private worker!: Worker;
  private api: Remote<SearchApiType> | SearchApiType = WorkerApi;
  constructor(worker?: Worker) {
    try {
      this.worker = worker ?? new Worker(new URL("./search.ww.ts", import.meta.url));
      this.api = wrap<SearchApiType>(this.worker);
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
  async *searchWorkspaces(workspaces: Workspace[], searchTerm: string) {
    for await (const scan of await this.api.searchWorkspaces(workspaces, searchTerm)) {
      if (scan.matches.length) yield scan;
    }
  }
  teardown() {
    return this.worker?.terminate?.();
  }
}
