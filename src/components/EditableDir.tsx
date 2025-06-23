"use client";
import { Workspace } from "@/Db/Workspace";
import { useFileTreeMenuCtx } from "@/components/FileTreeProvider";
import { useCopyKeydownImages } from "@/components/FiletreeMenu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { WorkspaceRouteType } from "@/context/WorkspaceHooks";
import { useEditable } from "@/hooks/useEditable";
import { TreeDir, TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, basename, relPath } from "@/lib/paths2";
import { ChevronRight, Folder, FolderOpen } from "lucide-react";
import { ComponentProps } from "react";
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
    treeNode: treeDir,
    expand,
  });

  const { handleCopyKeyDown } = useCopyKeydownImages(currentWorkspace);
  const { setFileTreeCtx } = useFileTreeMenuCtx();

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
        "w-full flex cursor-pointer select-none group/dir my-0.5"
      )}
      onKeyDown={(e) => handleCopyKeyDown(handleKeyDown)(e, fullPath)}
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
              setFileTreeCtx({
                editing: fullPath,
                editType: "rename",
                virtual: null,
                focused: fullPath,
                selectedRange: [],
              });
            }}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                className={"bg-transparent outline-none border-b border-dashed border-black w-full"}
                type="text"
                value={basename(fileName)}
                onChange={(e) => setFileName(relPath(e.target.value))}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
              />
            ) : (
              basename(fullPath)
            )}
          </div>
        </div>
      </div>
    </span>
  );
};
EditableDir.displayName = "EditableDir";
