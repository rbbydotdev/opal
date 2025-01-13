"use client";
import { TreeDir, TreeNode } from "@/clientdb/filetree";
import { Workspace } from "@/clientdb/Workspace";
import { useEditable } from "@/components/useEditable";
import { WorkspaceRouteType } from "@/context";
import { AbsPath, relPath } from "@/lib/paths";
import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { twMerge } from "tailwind-merge";

export const EditableItem = ({
  depth,
  fullPath,
  treeNode,
  currentWorkspace,
  className,
  workspaceRoute,
  expand,
  onDragStart,
  onClick,
  isDir,
}: {
  currentWorkspace: Workspace;
  onDragStart: (e: React.DragEvent) => void;
  workspaceRoute: WorkspaceRouteType;
  className?: string;
  treeNode: TreeNode | TreeDir;
  onClick?: (e: React.MouseEvent<Element, MouseEvent>) => void;
  fullPath: AbsPath;
  expand: (node: TreeNode, value: boolean) => void;
  depth: number;
  isDir: boolean;
}) => {
  const {
    isEditing,
    isFocused,
    setEditing,
    setFocused,
    setFileName,
    handleKeyDown,
    handleBlur,
    handleClick,
    handleMouseUp,
    linkRef,
    inputRef,
    fileName,
  } = useEditable({
    treeNode,
    expand,
    onClick,
    currentWorkspace,
    workspaceRoute,
  });

  return (
    <div className="select-none group">
      {!isEditing ? (
        isDir ? (
          <span
            draggable
            data-treepath={fullPath.str}
            data-treetype="dir"
            onClick={handleClick}
            tabIndex={0}
            onDragStart={onDragStart}
            ref={linkRef}
            onFocus={() => setFocused(fullPath)}
            className={twMerge(
              "w-full inline-block group cursor-pointer select-none group",
              isFocused ? "font-bold" : "",
              className
            )}
            onKeyDown={handleKeyDown}
          >
            <span className="inline-flex group" style={{ marginLeft: depth * 1 + "rem" }}>
              <span className="mr-2">
                <ChevronDown size={18} className="group-data-[state=closed]:hidden" />
                <ChevronRight size={18} className="group-data-[state=open]:hidden" />
              </span>
              <span onDoubleClick={() => setEditing(fullPath)}>{fileName.basename()}</span>
            </span>
          </span>
        ) : (
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
            onMouseUp={handleMouseUp}
            onClick={handleClick}
          >
            <div style={{ marginLeft: depth + 1 + "rem" }}>
              <File selected={isFocused}>
                <span className="py-1.5 group-focus:font-bold">{fileName}</span>
              </File>
            </div>
          </Link>
        )
      ) : (
        <div style={{ marginLeft: depth + 1.5 + "rem" }}>
          <File selected={isFocused} data-treepath={fullPath.str} data-treetype={isDir ? "dir" : "file"}>
            <input
              ref={inputRef}
              className="bg-transparent outline-none border-b border-dashed border-black"
              type="text"
              value={fileName.str}
              onChange={(e) =>
                setFileName(isDir ? fullPath.dirname().join(e.target.value).basename() : relPath(e.target.value))
              }
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
