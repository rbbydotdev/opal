import { TreeFileJType, TreeNode } from "@/components/SidebarFileMenu/FileTree/TreeNode";

export const INTERNAL_NODE_FILE_TYPE = "web application/opal-file-node+json";

export type NodeDataJType = { nodes: TreeFileJType[] };
export type NodeDataType = { nodes: TreeNode[] };
