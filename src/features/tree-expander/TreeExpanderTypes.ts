import { TreeNode } from "@/components/filetree/TreeNode";
import { AbsPath } from "@/lib/paths2";

export type ExpandMap = { [path: string]: boolean };

export interface TreeExpanderValue {
  expandSingle: (path: string, expanded: boolean) => void;
  expanded: ExpandMap;
  setExpandAll: (state: boolean) => void;
  expanderId: string;
  expandForNode: (node: TreeNode, state: boolean) => void;
  isExpanded: (node: string | TreeNode) => boolean;
  expandForFile: (dirTree: string[], file: AbsPath | string | null, exp: ExpandMap) => ExpandMap;
  defaultExpanded: boolean;
}
