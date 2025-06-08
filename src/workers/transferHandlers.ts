import { Workspace, WorkspaceJType } from "@/Db/Workspace";
import { transferHandlers } from "comlink";
import { asyncGeneratorTransferHandler } from "comlink-async-generator";

transferHandlers.set("asyncGenerator", asyncGeneratorTransferHandler);
transferHandlers.set("Workspace", {
  canHandle: (obj): obj is Workspace => obj instanceof Workspace,
  serialize: (obj: Workspace) => {
    console.log(obj.toJSON());
    return [
      { value: obj.toJSON() }, // Only serializable data
      [], // No transferable objects
    ];
  },
  deserialize: (serialized: { value: WorkspaceJType }) => {
    return Workspace.FromJSON(serialized.value);
  },
});
