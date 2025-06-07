import { Workspace, WorkspaceJType } from "@/Db/Workspace";
import { transferHandlers } from "comlink";
import { asyncGeneratorTransferHandler } from "comlink-async-generator";

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
    console.log("!!!!", serialized.value.disk.indexCache?.children);
    const ws = Workspace.FromJSON(serialized.value);
    console.log("??????", ws.disk.fileTree.root.children);
    return ws;
  },
});
