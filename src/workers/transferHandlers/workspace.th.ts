import { Workspace, WorkspaceJType } from "@/data/Workspace";
import { transferHandlers } from "comlink";
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
