"use client";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { AbsPath } from "@/lib/paths";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ComponentProps, useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

export const EditableDir = ({
  depth,
  className,
  onRename,
  fullPath,
  ...props
}: {
  className?: string;
  depth: number;
  onRename: (name: AbsPath) => Promise<AbsPath>;
  fullPath: AbsPath;
} & ComponentProps<typeof SidebarMenuButton>) => {
  const dirRef = useRef<HTMLElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [dirName, setDirName] = useState(fullPath);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // const fullAbsPath = useMemo(() => absPath(fullPath), [fullPath]);

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
      setIsEditing(false);
    }
    if (e.key === "Enter") {
      if (isEditing) {
        setIsEditing(false);
        onRename(dirName).then((newName) => {
          setDirName(newName);
        });
      } else {
        setIsEditing(true);
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
      setIsEditing(false);
      setDirName(fullPath);
    }
  };

  return (
    <span
      tabIndex={0}
      {...props}
      ref={dirRef}
      onClick={handleClick}
      className={twMerge("w-full inline-block group cursor-pointer select-none", true ? "font-bold" : "", className)}
      onKeyDown={handleKeyDown}
    >
      <span className="inline-flex" style={{ marginLeft: depth * 1 + "rem" }}>
        <span className="mr-2">
          <ChevronDown size={18} className="group-data-[state=closed]:hidden" />
          <ChevronRight size={18} className="group-data-[state=open]:hidden" />
        </span>
        {!isEditing ? (
          <span onDoubleClick={() => setIsEditing(true)}>{dirName}</span>
        ) : (
          <input
            ref={inputRef}
            className="bg-transparent outline-none border-b border-dashed border-black"
            type="text"
            value={dirName.str}
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
