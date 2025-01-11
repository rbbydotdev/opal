"use client";
import { TreeDir, TreeNode } from "@/clientdb/filetree";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { useEditable } from "@/components/useEditable";
import { AbsPath } from "@/lib/paths";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

export const EditableDir = ({
  depth,
  className,
  onRename,
  onFileRemove,
  expand,
  treeDir,
  fullPath,

  onCancelNew,
  ...props
}: {
  className?: string;
  depth: number;
  treeDir: TreeDir;
  expand: (node: TreeNode, value: boolean) => void;
  onRename: (name: AbsPath) => Promise<AbsPath>;
  onCancelNew: (newPath: AbsPath) => void;
  onFileRemove: (path: AbsPath) => Promise<void>;
  fullPath: AbsPath;
} & ComponentProps<typeof SidebarMenuButton>) => {
  const {
    isFocused,
    setEditing,
    isEditing,
    setFocused,
    setFileName,
    handleKeyDown,
    handleBlur,
    handleClick,
    linkRef,
    inputRef,
    fileName,
  } = useEditable({
    treeNode: treeDir,
    expand,
    onRename,
    onCancelNew,
  });

  return (
    <span
      tabIndex={0}
      {...props}
      ref={linkRef}
      data-treepath={fullPath.str}
      data-treetype="dir"
      onClick={(e: unknown) => {
        //@ts-ignore
        props?.onClick?.(e);
        handleClick();
      }}
      onFocus={() => setFocused(treeDir.path)}
      className={twMerge(
        "w-full inline-block group cursor-pointer select-none",
        isFocused ? "font-bold" : "",
        className
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
            tabIndex={0}
            onFocus={() => setFocused(treeDir.path)}
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
