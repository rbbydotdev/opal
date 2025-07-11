import { Workspace } from "@/Db/Workspace";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import React from "react";

export type FileItemContextMenuComponentType = ({
  children,
  fileNode,
  disabled,
  currentWorkspace,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  fileNode: TreeNode;
  currentWorkspace: Workspace;
}) => React.ReactElement | null;
