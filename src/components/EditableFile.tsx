"use client";
import { TreeFile, TreeNode } from "@/clientdb/filetree";
import { Workspace } from "@/clientdb/Workspace";
import { useEditable } from "@/components/useEditable";
import { WorkspaceRouteType } from "@/context";
import { AbsPath, relPath } from "@/lib/paths";
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
    setFocused,

    fileName,
    handleKeyDown,
    handleBlur,
    handleClick,
    setFileName,
    linkRef,
    inputRef,
  } = useEditable({
    treeNode: treeFile,
    expand,
    currentWorkspace,
    workspaceRoute,
  });

  useEffect(() => {
    if (isSelected) setFocused(fullPath);
  }, [fullPath, isSelected, setFocused]);

  return (
    <div className="select-none">
      {!isEditing ? (
        <Link
          draggable
          onDragStart={onDragStart}
          data-treepath={fullPath.str}
          data-treetype="file"
          href={currentWorkspace.resolveFileUrl(fullPath)}
          className={twMerge(className, "group cursor-pointer")}
          ref={linkRef}
          tabIndex={0}
          onFocus={() => setFocused(fullPath)}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
        >
          <div style={{ marginLeft: depth + 1 + "rem" }}>
            <File selected={isSelected}>
              <span className="py-1.5 group-focus:font-bold">{fileName}</span>
            </File>
          </div>
        </Link>
      ) : (
        <div style={{ marginLeft: depth + 1.5 + "rem" }}>
          <File selected={isSelected} data-treepath={fullPath.str} data-treetype="file">
            <input
              ref={inputRef}
              className="bg-transparent py-1.5 outline-none font-bold border-b border-dashed border-black"
              type="text"
              value={fileName.str}
              onChange={(e) => setFileName(relPath(e.target.value))}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
            />
          </File>
        </div>
      )}
    </div>
  );
};

export function File({ selected = false, children }: { selected?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`items-center flex gap-2 ${selected ? "before:content-[attr(data-star)] before:text-accent2" : ""}`}
      data-star="✦"
    >
      {children}
    </span>
  );
}
