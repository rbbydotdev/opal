"use client";
import { Workspace } from "@/Db/Workspace";
import { useEditable } from "@/components/useEditable";
import { WorkspaceRouteType } from "@/context";
import { TreeFile, TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, relPath } from "@/lib/paths";
import clsx from "clsx";
import Link from "next/link";
import { useEffect } from "react";
import { twMerge } from "tailwind-merge";

export const EditableFile = ({
  depth,
  fullPath,
  treeFile,
  currentWorkspace,
  className,
  workspaceRoute,
  expand,
  onDragStart,
}: {
  currentWorkspace: Workspace;
  onDragStart: (e: React.DragEvent) => void;
  workspaceRoute: WorkspaceRouteType;
  className?: string;
  treeFile: TreeFile;
  fullPath: AbsPath;
  expand: (node: TreeNode, value: boolean) => void;
  depth: number;
}) => {
  const {
    isEditing,
    isSelected,
    fileName,
    handleKeyDown,
    handleMouseDown,
    handleBlur,
    handleClick,
    handleMouseUp,
    handleFocus,
    isSelectedRange,
    isFocused,
    setFileName,
    linkRef,
    inputRef,
  } = useEditable({
    treeNode: treeFile,
    expand,
    currentWorkspace,
    workspaceRoute,
  });

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
        <Link
          draggable
          onDragStart={onDragStart}
          href={currentWorkspace.resolveFileUrl(fullPath)}
          className={twMerge(
            className,
            isSelectedRange || isFocused ? "bg-sidebar-accent font-bold" : "",
            "group cursor-pointer"
          )}
          ref={linkRef}
          tabIndex={0}
          onFocus={handleFocus}
          onMouseUp={handleMouseUp}
          onMouseDown={handleMouseDown}
          onKeyDown={handleKeyDown}
          prefetch={false}
        >
          {/* <div className={clsx("max-w-full", { ["-ml-[1.2rem]"]: treeFile.path.isImage() })}> */}
          <div className="w-full flex items-center">
            {treeFile.path.isImage() && (
              <img
                src={treeFile.path.urlSafe() + (!treeFile.path.endsWith(".svg") ? "?thumb=1" : "")}
                alt=""
                className="w-4 h-4 rounded-sm border border-black flex-shrink-0 bg-white mr-2"
              />
            )}
            <div className="py-2.5 text-xs truncate" style={{ paddingLeft: depth + "rem" }}>
              {fileName}
            </div>
          </div>
        </Link>
      ) : (
        <div className={twMerge(className, "w-full")}>
          <div className="w-full">
            {treeFile.path.isImage() && (
              <img
                src={treeFile.path.urlSafe() + (!treeFile.path.endsWith(".svg") ? "?thumb=1" : "")}
                alt=""
                className="w-4 h-4 rounded-sm border border-black flex-shrink-0 bg-white mr-2"
              />
            )}
            <input
              ref={inputRef}
              className="bg-transparent py-2 outline-none font-bold border-b border-dashed border-black text-xs w-full "
              style={{ paddingLeft: depth + "rem" }}
              type="text"
              value={fileName.str}
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

export function File({
  selected = false,
  className,
  children,
}: {
  // depth: number;
  selected?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex items-center w-full">
      <div
        className={clsx(
          { flex: selected },
          { hidden: !selected },
          "absolute w-2 h-2 flex justify-center items-center text-purple-700 text-xs"
        )}
      >
        {"✦"}
      </div>
      <div
        className={clsx(
          // { "before:content-[attr(data-star)] before:text-accent2": selected },
          // { "ml-2": !selected },
          // "truncate w-full"
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
