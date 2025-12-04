import { TreeNode } from "@/components/filetree/TreeNode";

export type ExpandMap = { [path: string]: boolean };

export interface TreeExpanderValue {
  expandSingle: (path: string, expanded: boolean) => void;
  expanded: ExpandMap;
  setExpandAll: (state: boolean) => void;
  expanderId: string;
  expandForNode: (node: TreeNode, state: boolean) => void;
  isExpanded: (node: string | TreeNode) => boolean;
  defaultExpanded: boolean;
}
