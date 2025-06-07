import { Workspace } from "@/Db/Workspace";
import * as Comlink from "comlink";
import "../transferHandlers";

const WorkerApi = {
  async *searchWorkspace(workspace: Workspace, searchStr: string) {
    console.log(workspace.disk.fileTree.root.children);
    yield* workspace.NewScannable().search(searchStr);
  },
};

Comlink.expose(WorkerApi);

export type SearchApiType = typeof WorkerApi;
