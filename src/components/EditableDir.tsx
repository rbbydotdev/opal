"use client";
import { TreeDir, TreeNode } from "@/clientdb/filetree";
import { Workspace } from "@/clientdb/Workspace";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { useEditable } from "@/components/useEditable";
import { WorkspaceRouteType } from "@/context";
import { AbsPath } from "@/lib/paths";
import { ChevronDown, ChevronRight } from "lucide-react";
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
      data-treepath={fullPath.str}
      data-treetype="dir"
      onClick={handleClick}
      tabIndex={0}
      onDragStart={onDragStart}
      // onDragEnd={onDragEnd}
      ref={linkRef}
      onMouseDown={handleMouseDown}
      onFocus={handleFocus}
      className={twMerge(
        isSelectedRange || isFocused ? "bg-sidebar-accent font-bold" : "",
        className,
        "w-full inline-block group cursor-pointer select-none rounded-none"
      )}
      onKeyDown={handleKeyDown}
    >
      <span className="inline-flex" style={{ marginLeft: depth * 1 + "rem" }}>
        <span className="mr-2">
          <ChevronDown size={18} className="group-data-[state=closed]:hidden" />
          <ChevronRight size={18} className="group-data-[state=open]:hidden" />
        </span>
        {!isEditing ? (
          <span onDoubleClick={() => setEditing(fullPath)}>{fileName.basename()}</span>
        ) : (
          <input
            data-treepath={fullPath.str}
            data-treetype="dir"
            ref={inputRef}
            className="bg-transparent outline-none border-b border-dashed border-black"
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
