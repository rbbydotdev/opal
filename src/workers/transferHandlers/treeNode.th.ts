import { TreeDirRoot, TreeDirRootJType, TreeNode, TreeNodeJType } from "@/lib/FileTree/TreeNode";
import { transferHandlers } from "comlink";

transferHandlers.set("TreeDirRoot", {
  canHandle: (obj): obj is TreeDirRoot => obj instanceof TreeDirRoot,
  serialize: (obj: TreeDirRoot) => {
    return [
      { value: obj.toJSON() }, // Only serializable data
      [], // No transferable objects
    ];
  },
  deserialize: (serialized: { value: TreeDirRootJType }) => {
    return TreeDirRoot.FromJSON(serialized.value);
  },
});

transferHandlers.set("TreeNode", {
  canHandle: (obj): obj is TreeNode => obj instanceof TreeNode,
  serialize: (obj: TreeNode) => {
    return [
      { value: obj.toJSON() }, // Only serializable data
      [], // No transferable objects
    ];
  },
  deserialize: (serialized: { value: TreeNodeJType }) => {
    return TreeNode.FromJSON(serialized.value);
  },
});
