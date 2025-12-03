import { useFileTreeMenuCtx } from "@/app/filemenu/FileTreeMenuCtxProvider";
import { TreeDir, TreeNode } from "@/components/sidebar/FileTree/TreeNode";
import { WorkspaceRouteType } from "@/context/WorkspaceContext";
import { useEditable } from "@/hooks/useEditable";
import { AbsPath, basename, RelPath, relPath } from "@/lib/paths2";
import { cn } from "@/lib/utils";
import { Workspace } from "@/workspace/Workspace";
import { ChevronRight, Folder, FolderOpen } from "lucide-react";
import { useEffect } from "react";
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
}) => {
  const {
    isFocused,
    isSelectedRange,
    isEditing,
    setFileName,
    handleKeyDown,
    handleFocus,
    handleMouseDown,
    handleMouseUp,
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

  const { setFileTreeCtx } = useFileTreeMenuCtx();

  useEffect(() => {
    //weird edge case hmmmmmmm keeps focus after editing
    if (linkRef.current && isFocused && !isEditing) {
      linkRef.current.focus();
    }
  }, [isFocused, isEditing, linkRef]);

  return (
    <div className="mx-1">
      <a
        {...props}
        draggable
        onClick={handleClick}
        tabIndex={0}
        onDragStart={onDragStart}
        ref={linkRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onFocus={handleFocus}
        className={cn(
          { "ring-sidebar-accent ring-2 font-bold": isSelectedRange || isFocused },
          className,
          "w-full flex cursor-pointer select-none group/dir"
        )}
        onKeyDown={(e) => handleKeyDown(e)}
      >
        <div className="flex w-full items-center truncate" style={{ paddingLeft: depth + 0.15 + "rem" }}>
          <div className="mr-1">
            <ChevronRight
              size={14}
              className={
                "transition-transform duration-100 rotate-0 group-data-[state=open]/dir:rotate-90 -ml-[0.175rem]"
              }
            />
          </div>
          <div className="text-xs truncate w-full flex items-center pl-[0.175rem]">
            <FolderOpen className="w-3 h-3 flex-shrink-0 mr-2 group-data-[state=open]/dir:block hidden" />
            <Folder className="w-3 h-3 flex-shrink-0 mr-2 group-data-[state=closed]/dir:block hidden" />
            <div
              className="truncate text-xs"
              onDoubleClick={() => {
                if (isEditing) return;
                setFileTreeCtx(({ anchorIndex }) => ({
                  anchorIndex,
                  editing: fullPath,
                  editType: "rename",
                  virtual: null,
                  focused: fullPath,
                  selectedRange: [],
                }));
              }}
            >
              {isEditing ? (
                <input
                  ref={inputRef}
                  className={"bg-transparent outline-none border-b border-dashed border-border w-full"}
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName((!e.target.value ? "" : relPath(e.target.value)) as RelPath)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                />
              ) : (
                <span title={fullPath}>{basename(fullPath)}</span>
              )}
            </div>
          </div>
        </div>
      </a>
    </div>
  );
};
EditableDir.displayName = "EditableDir";
