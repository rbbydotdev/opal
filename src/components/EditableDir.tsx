"use client";
import { Workspace } from "@/Db/Workspace";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { WorkspaceRouteType } from "@/context";
import { useEditable } from "@/hooks/useEditable";
import { TreeDir, TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsolutePath2, basename, relPath } from "@/lib/paths2";
import { ChevronRight, Folder, FolderOpen } from "lucide-react";
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

  fullPath: AbsolutePath2;
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
        "w-full flex cursor-pointer select-none group/dir"
      )}
      onKeyDown={handleKeyDown}
      style={{ paddingLeft: depth + "rem" }}
    >
      <div className="flex w-full items-center truncate">
        <div className="mr-1">
          <ChevronRight
            size={14}
            className={"transition-transform duration-100 rotate-0 group-data-[state=open]/dir:rotate-90 -ml-0.5"}
          />
        </div>
        <div className="text-xs truncate w-full flex items-center">
          <FolderOpen className="w-3 h-3 flex-shrink-0 mr-2 group-data-[state=open]/dir:block hidden" />
          <Folder className="w-3 h-3 flex-shrink-0 mr-2 group-data-[state=closed]/dir:block hidden" />
          <div
            className="truncate text-xs"
            onDoubleClick={() => {
              if (isEditing) return;
              setEditing(fullPath);
            }}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                className={"bg-transparent outline-none border-b border-dashed border-black w-full"}
                type="text"
                value={basename(fileName) as string}
                onChange={(e) => setFileName(relPath(e.target.value))}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
              />
            ) : (
              (basename(fullPath) as string)
            )}
          </div>
        </div>
      </div>
    </span>
  );
};
EditableDir.displayName = "EditableDir";

// <div className={twMerge(className, "w-full")}>
//   <div className="w-full flex items-center truncate" style={{ paddingLeft: depth + "rem" }}>
//     <input
//       ref={inputRef}
//       className="bg-transparent py-2 outline-none font-bold border-b border-dashed border-black text-xs w-full "
//       type="text"
//       value={fileName.str}
//       onChange={(e) => setFileName(relPath(e.target.value))}
//       onKeyDown={handleKeyDown}
//       onBlur={handleBlur}
//     />
//   </div>
// </div>
