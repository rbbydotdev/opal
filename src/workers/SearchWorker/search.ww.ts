import { Workspace, WorkspaceJType } from "@/Db/Workspace";
import { SearchWorkerApi } from "@/workers/SearchWorker/SearchWorkerApi";
import * as Comlink from "comlink";
import { transferHandlers } from "comlink";
import { asyncGeneratorTransferHandler } from "comlink-async-generator";
// This function is called to ensure the transfer handlers are registered
transferHandlers.set("asyncGenerator", asyncGeneratorTransferHandler);
transferHandlers.set("Workspace", {
  canHandle: (obj): obj is Workspace => obj instanceof Workspace,
  serialize: (obj: Workspace) => {
    return [
      { value: obj.toJSON() }, // Only serializable data
      [], // No transferable objects
    ];
  },
  deserialize: (serialized: { value: WorkspaceJType }) => {
    return Workspace.FromJSON(serialized.value);
  },
});

Comlink.expose(SearchWorkerApi);
