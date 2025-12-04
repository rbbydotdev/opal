import { TreeNode } from "@/components/filetree/TreeNode";
import { Workspace } from "@/workspace/Workspace";
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
