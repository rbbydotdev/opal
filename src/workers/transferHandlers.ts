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
    return Workspace.FromJSON(serialized.value);
  },
});
// // SearchResultData,
// transferHandlers.set("SearchResults", {
//   canHandle: (obj): obj is SearchResults => {
//     console.log(">>>> checking if obj is SearchResults", obj?.name, obj?.constructor);
//     console.log(JSON.stringify(obj, null, 2));
//     return obj instanceof SearchResults;
//   },
//   serialize: (obj: SearchResults) => {
//     console.log("serializing SearchResults");
//     return [
//       { value: obj.toJSON() }, // Only serializable data
//       [], // No transferable objects
//     ];
//   },
//   deserialize: (serialized: { value: ReturnType<SearchResults["toJSON"]> }) => {
//     console.log("deserializing SearchResults");
//     return SearchResults.FromJSON(serialized.value);
//   },
// });
