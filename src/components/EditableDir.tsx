"use client";
import { TreeDir } from "@/clientdb/filetree";
import { useFileTreeMenuContext } from "@/components/SidebarFileMenu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { AbsPath } from "@/lib/paths";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ComponentProps, useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

export const EditableDir = ({
  depth,
  className,
  onRename,
  onFileRemove,
  treeDir,
  fullPath,
  ...props
}: {
  className?: string;
  depth: number;
  treeDir: TreeDir;
  onRename: (name: AbsPath) => Promise<AbsPath>;
  onFileRemove: (path: AbsPath) => Promise<void>;
  fullPath: AbsPath;
} & ComponentProps<typeof SidebarMenuButton>) => {
  const dirRef = useRef<HTMLElement>(null);

  const { setFocusedNode } = useFileTreeMenuContext();
  const { editing, resetEditing, setEditing, cancelEditing } = useFileTreeMenuContext();
  //todo
  // if (treeDir === editNode) {
  // }

  const isEditing = editing === fullPath.str;
  const [dirName, setDirName] = useState(fullPath);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isEditing) {
      props.onClick?.(e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setDirName(fullPath);
      cancelEditing();
    }
    if (e.key === "Enter") {
      if (isEditing) {
        resetEditing();
        onRename(dirName).then((newName) => {
          setDirName(newName);
        });
        return e.stopPropagation();
      } else {
        resetEditing();
      }
    }
    if (e.key === " ") {
      dirRef?.current?.click();
      if (!isEditing) {
        e.preventDefault();
      }
    }
  };

  const handleBlur = () => {
    if (isEditing) {
      cancelEditing();
      setDirName(fullPath);
    }
  };

  return (
    <span
      tabIndex={0}
      {...props}
      ref={dirRef}
      data-treepath={fullPath.str}
      data-treetype="dir"
      onClick={handleClick}
      onFocus={() => setFocusedNode(treeDir)}
      className={twMerge("w-full inline-block group cursor-pointer select-none", true ? "font-bold" : "", className)}
      onKeyDown={handleKeyDown}
    >
      <span className="inline-flex" style={{ marginLeft: depth * 1 + "rem" }}>
        <span className="mr-2">
          <ChevronDown size={18} className="group-data-[state=closed]:hidden" />
          <ChevronRight size={18} className="group-data-[state=open]:hidden" />
        </span>
        {!isEditing ? (
          <span onDoubleClick={() => setEditing(fullPath.str)}>{dirName.basename()}</span>
        ) : (
          <input
            data-treepath={fullPath.str}
            data-treetype="dir"
            ref={inputRef}
            className="bg-transparent outline-none border-b border-dashed border-black"
            type="text"
            tabIndex={0}
            onFocus={() => setFocusedNode(treeDir)}
            value={dirName.basename().str}
            onChange={(e) => setDirName(fullPath.dirname().join(e.target.value))}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
          />
        )}
      </span>
    </span>
  );
};
EditableDir.displayName = "EditableDir";
