"use client";
import { useCopyKeydownImages } from "@/components/FiletreeMenu";
import { WorkspaceRouteType } from "@/context/WorkspaceHooks";
import { Thumb } from "@/Db/Thumb";
import { Workspace } from "@/Db/Workspace";
import { useEditable } from "@/hooks/useEditable";
import { TreeFile, TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, encodePath, equals, isImage, relPath } from "@/lib/paths2";
import clsx from "clsx";
import { FileText } from "lucide-react";
import Link from "next/link";
import { ComponentProps, HTMLAttributes, useEffect } from "react";
import { twMerge } from "tailwind-merge";

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
    setEditing,
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
  const { handleCopyKeyDown } = useCopyKeydownImages(currentWorkspace);

  //
  useEffect(() => {
    if (isFocused && !isEditing) {
      linkRef.current?.focus();
      //TODO: 'sometimes' on load focus is lost when instead we want it, https://github.com/vercel/next.js/issues/49386
      const timer = setTimeout(() => {
        linkRef.current?.focus();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isEditing, isFocused, linkRef]);

  return (
    <div className="select-none">
      {!isEditing ? (
        <ActiveLink
          active={equals(fullPath, workspaceRoute.path)}
          draggable
          onDragStart={onDragStart}
          href={currentWorkspace.resolveFileUrl(fullPath)}
          className={twMerge(
            className,

            isSelectedRange || isFocused ? "bg-sidebar-accent font-bold" : "",
            "group cursor-pointer my-0.5"
          )}
          ref={linkRef}
          tabIndex={0}
          onFocus={handleFocus}
          onMouseUp={handleMouseUp}
          onMouseDown={handleMouseDown}
          onKeyDown={(e) => handleCopyKeyDown(handleKeyDown)(e, fullPath)}
          onClick={handleClick}
          onDoubleClick={() => setEditing(fullPath)}
          prefetch={false}
        >
          <div className="w-full">
            <div style={{ paddingLeft: depth + "rem" }} className="truncate w-full flex items-center">
              <SelectedMark selected={isSelected} />
              {isImage(treeNode.path) ? (
                <img
                  src={Thumb.pathToURL(treeNode.path)}
                  alt=""
                  className="w-3 h-3 border border-black flex-shrink-0 bg-white mr-2"
                />
              ) : (
                <FileText className="w-3 h-3 flex-shrink-0 mr-2" />
              )}
              <div className="py-2.5 text-xs w-full truncate">{fileName}</div>
            </div>
          </div>
        </ActiveLink>
      ) : (
        <div className={twMerge(className, "w-full")}>
          <div className="w-full flex items-center truncate" style={{ paddingLeft: depth + "rem" }}>
            <SelectedMark selected={isSelected} />
            {isImage(treeNode.path) ? (
              <img
                src={encodePath(treeNode.path) + (!treeNode.path.endsWith(".svg") ? "?thumb=100" : "")}
                alt=""
                className="w-3 h-3 border border-black flex-shrink-0 bg-white mr-2"
              />
            ) : (
              <FileText className="w-3 h-3 flex-shrink-0 mr-2" />
            )}
            <input
              ref={inputRef}
              className="bg-transparent py-2 outline-none font-bold border-b border-dashed border-black text-xs w-full "
              type="text"
              value={fileName}
              onChange={(e) => setFileName(relPath(e.target.value))}
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
        "absolute w-2 h-2 flex justify-center items-center text-ring text-xs -ml-3"
      )}
    >
      {"✦"}
    </div>
  );
}

export const ActiveLink = ({
  active,
  prefetch,
  ...props
}: { active: boolean } & (ComponentProps<typeof Link> & HTMLAttributes<HTMLDivElement>)) => {
  if (!active) {
    return <Link {...props} prefetch={prefetch} />;
  }
  // @ts-ignore
  return <div {...props} />;
};
