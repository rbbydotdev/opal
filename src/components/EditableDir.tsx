"use client";
import { Workspace } from "@/Db/Workspace";
import { ClosedChevron, OpenedChevron } from "@/components/SidebarFileMenu/Icons";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { useEditable } from "@/components/useEditable";
import { WorkspaceRouteType } from "@/context";
import { TreeDir, TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath } from "@/lib/paths";
import { ComponentProps, useEffect } from "react";
import { twMerge } from "tailwind-merge";

export const EditableDir = ({
  depth,
  className,
  expand,
  treeDir,
  fullPath,
  workspaceRoute,
  currentWorkspace,
  onDragStart,
  onClick,
  ...props
}: {
  onDragStart: (e: React.DragEvent) => void;
  className?: string;
  depth: number;
  treeDir: TreeDir;
  currentWorkspace: Workspace;
  workspaceRoute: WorkspaceRouteType;
  onClick?: (e: React.MouseEvent<Element, MouseEvent>) => void;
  expand: (node: TreeNode, value: boolean) => void;

  fullPath: AbsPath;
} & ComponentProps<typeof SidebarMenuButton>) => {
  const {
    isFocused,
    isSelectedRange,
    isEditing,
    setEditing,
    setFileName,
    handleKeyDown,
    handleFocus,
    handleMouseDown,
    handleBlur,
    handleClick,
    linkRef,
    inputRef,
    fileName,
  } = useEditable({
    currentWorkspace,
    onClick,
    workspaceRoute,
    treeNode: treeDir,
    expand,
  });

  useEffect(() => {
    if (isFocused && !isEditing) {
      linkRef.current?.focus();
    }
  }, [isEditing, isFocused, linkRef]);

  return (
    <span
      {...props}
      draggable
      onClick={handleClick}
      tabIndex={0}
      onDragStart={onDragStart}
      ref={linkRef}
      onMouseDown={handleMouseDown}
      onFocus={handleFocus}
      className={twMerge(
        isSelectedRange || isFocused ? "bg-sidebar-accent font-bold" : "",
        className,
        "w-full inline-block group cursor-pointer select-none"
      )}
      onKeyDown={handleKeyDown}
    >
      <span className="inline-flex" style={{ marginLeft: depth + "rem" }}>
        <span className="mr-2">
          <OpenedChevron />
          <ClosedChevron />
        </span>
        {!isEditing ? (
          <span onDoubleClick={() => setEditing(fullPath)} className="text-xs">
            {fileName.basename()}
          </span>
        ) : (
          <input
            ref={inputRef}
            className="bg-transparent outline-none border-b border-dashed border-black text-xs"
            type="text"
            value={fileName.basename().str}
            onChange={(e) => setFileName(fullPath.dirname().join(e.target.value).basename())}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
          />
        )}
      </span>
    </span>
  );
};
EditableDir.displayName = "EditableDir";
