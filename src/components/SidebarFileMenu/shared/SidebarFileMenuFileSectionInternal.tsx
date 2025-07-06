"use client";

import { SidebarFileMenuFiles } from "@/components/SidebarFileMenu/trash-section/SidebarFileMenuFiles";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { useTreeExpanderContext } from "@/features/tree-expander/useTreeExpander";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { TreeDirRoot, TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath } from "@/lib/paths2";
import { Files } from "lucide-react";
import React, { JSX, useMemo } from "react";
import { twMerge } from "tailwind-merge";
export function SidebarFileMenuFileSectionInternal({
  title,
  className,
  scope,
  filter,
  children,
  Icon = Files,
  ...rest
}: {
  title: JSX.Element | string;
  className?: string;
  scope?: AbsPath;
  filter?: ((node: TreeNode) => boolean) | AbsPath[];
  children?: React.ReactNode;
  Icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  const { expandSingle, expanded, expandForNode } = useTreeExpanderContext();
  const { fileTreeDir, currentWorkspace } = useWorkspaceContext();
  const { renameDirOrFileMultiple } = useWorkspaceFileMgmt(currentWorkspace);

  const treeNode = useMemo(
    () => (typeof scope === "undefined" ? fileTreeDir : currentWorkspace.nodeFromPath(scope ?? null)),
    [currentWorkspace, fileTreeDir, scope]
  );
  return (
    <SidebarFileMenuFiles
      {...rest}
      title={title}
      Icon={Icon}
      className={twMerge("min-h-8", className)}
      filter={filter}
      fileTreeDir={treeNode as TreeDirRoot}
      renameDirOrFileMultiple={renameDirOrFileMultiple}
      expandSingle={expandSingle}
      expandForNode={expandForNode}
      expanded={expanded}
    >
      <div className="h-full flex items-center rounded-none">{children}</div>
    </SidebarFileMenuFiles>
  );
}
