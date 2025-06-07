import { Workspace } from "@/Db/Workspace";
import { SearchApiType } from "@/workers/SearchWorker/search.ww";
import { wrap } from "comlink";
import "../transferHandlers";

export async function* SearchWorkspace(workspace: Workspace, searchTerm: string) {
  const worker = new Worker(new URL("./search.ww.ts", import.meta.url));
  const searcher = wrap<SearchApiType>(worker);
  try {
    for await (const results of await searcher.searchWorkspace(workspace, searchTerm)) {
      yield results;
    }
  } finally {
    worker.terminate();
  }
}
