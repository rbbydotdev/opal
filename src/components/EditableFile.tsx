import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { ImageFileHoverCard } from "@/components/ImageFileHoverCard";
import { WorkspaceRouteType } from "@/context/WorkspaceContext";
import { Thumb } from "@/Db/Thumb";
import { Workspace } from "@/Db/Workspace";
import { useEditable } from "@/hooks/useEditable";
import { TreeFile, TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, equals, isImage, prefix, relPath } from "@/lib/paths2";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { FileCode2, FileText } from "lucide-react";
import { ComponentProps, HTMLAttributes, useEffect } from "react";
import { twMerge } from "tailwind-merge";
import { RelPath } from "../lib/paths2";

export const EditableFile = ({
  depth,
  fullPath,
  treeNode,

  currentWorkspace,
  className,
  workspaceRoute,
  expand,
  onDragStart,
}: {
  currentWorkspace: Workspace;
  workspaceRoute: WorkspaceRouteType;
  className?: string;
  treeNode: TreeFile;
  fullPath: AbsPath;
  expand: (node: TreeNode, value: boolean) => void;
  depth: number;
  onDragStart: (e: React.DragEvent) => void;
}) => {
  const {
    isEditing,
    fileName,
    handleKeyDown,
    handleMouseDown,
    handleBlur,
    handleClick,
    isSelected,
    handleMouseUp,
    handleFocus,
    isSelectedRange,
    isFocused,
    setFileName,
    linkRef,
    inputRef,
  } = useEditable({
    treeNode,
    expand,
    currentWorkspace,
  });
  const { setFileTreeCtx } = useFileTreeMenuCtx();

  useEffect(() => {
    if (linkRef.current && isFocused && !isEditing) {
      linkRef?.current?.focus();
    }
  }, [isFocused, isEditing, linkRef]);

  return (
    <div className="select-none">
      {!isEditing ? (
        <ActiveLink
          active={equals(fullPath, workspaceRoute.path)}
          draggable
          onDragStart={onDragStart}
          to={currentWorkspace.resolveFileUrl(fullPath)}
          className={cn(
            className,
            { "bg-sidebar-accent font-bold": isSelectedRange || isFocused },
            "group cursor-pointer"
          )}
          ref={linkRef}
          tabIndex={0}
          onFocus={handleFocus}
          onMouseUp={handleMouseUp}
          title={fullPath}
          onMouseDown={handleMouseDown}
          onKeyDown={(e) => handleKeyDown(e)}
          onClick={handleClick}
          onDoubleClick={() =>
            setFileTreeCtx(({ anchorIndex }) => ({
              anchorIndex,
              editing: fullPath,
              editType: "rename",
              focused: fullPath,
              virtual: null,
              selectedRange: [],
            }))
          }
        >
          <div className="w-full">
            <div style={{ paddingLeft: depth + "rem" }} className="truncate w-full flex items-center">
              <SelectedMark selected={isSelected} />
              <IconForTreeNode treeNode={treeNode} />
              <div className="py-2.5 text-xs w-full truncate">{prefix(fileName)}</div>
            </div>
          </div>
        </ActiveLink>
      ) : (
        <div className={twMerge(className, "w-full")}>
          <div className="w-full flex items-center truncate" style={{ paddingLeft: depth + "rem" }}>
            <SelectedMark selected={isSelected} />
            {isImage(treeNode.path) ? (
              <img
                src={Thumb.resolveURLFromNode(treeNode)}
                alt=""
                className="w-6 h-6 border border-border flex-shrink-0 bg-white mr-2"
              />
            ) : (
              <FileText className="w-3 h-3 flex-shrink-0 mr-2" />
            )}
            <input
              ref={inputRef}
              className="bg-transparent py-2 outline-none font-bold border-b border-dashed border-border text-xs w-full "
              type="text"
              value={fileName}
              onChange={(e) => setFileName((!e.target.value ? "" : relPath(e.target.value)) as RelPath)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export function SelectedMark({ selected = false }: { selected?: boolean }) {
  return (
    <div
      className={clsx(
        { flex: selected },
        { hidden: !selected },
        "absolute w-2 h-2 flex justify-center items-center text-ring text-xs -ml-[1.075rem] mr-2"
      )}
    >
      {"✦"}
    </div>
  );
}

export const ActiveLink = ({
  active,
  ...props
}: { active: boolean } & (ComponentProps<typeof Link> & HTMLAttributes<HTMLDivElement>)) => {
  if (!active) {
    return <Link {...props} />;
  }
  // @ts-ignore
  return <div {...props} />;
};

function IconForTreeNode({ treeNode }: { treeNode: TreeNode }) {
  switch (treeNode.getMimeType()) {
    case "text/markdown":
      return <FileText className="w-3 h-3 flex-shrink-0 mr-2" />;
    case "text/css":
      return <FileCode2 className="w-3 h-3 flex-shrink-0 mr-2" />;
    case "image/png":
    case "image/jpeg":
    case "image/gif":
    case "image/webp":
      return <ImageNodeIcon treeNode={treeNode} />;
    default:
      return <FileText className="w-3 h-3 flex-shrink-0 mr-2" />;
  }
}

function ImageNodeIcon({ treeNode }: { treeNode: TreeNode }) {
  return (
    <ImageFileHoverCard fallbackSrc={treeNode.path}>
      <img
        src={Thumb.resolveURLFromNode(treeNode)}
        alt=""
        className="w-6 h-6 border border-foreground flex-shrink-0 bg-foreground mr-2 object-cover"
      />
    </ImageFileHoverCard>
  );
}
