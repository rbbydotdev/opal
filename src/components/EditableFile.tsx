"use client";
import { useFileTreeMenuContext } from "@/components/SidebarFileMenu";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { AbsPath, RelPath, relPath } from "@/lib/paths";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

export const EditableFile = ({
  depth,
  isSelected,
  fullPath,
  onRename,
  ...props
}: React.ComponentProps<typeof Link> & {
  href: string;
  fullPath: AbsPath;
  isSelected: boolean;
  onRename: (newPath: AbsPath) => Promise<AbsPath>;
  depth: number;
}) => {
  const { editing, resetEditing, setEditing } = useFileTreeMenuContext();
  const [fileName, setFileName] = useState<RelPath>(fullPath.basename());
  const linkRef = useRef<HTMLAnchorElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inbound, setInbound] = useLocalStorage<string | null>("EditableLink/inbound", null);
  const pathname = usePathname();

  const isEditing = editing === fullPath.str;

  const setIsEditing = useCallback(
    (editing: boolean) => {
      if (editing) {
        setEditing(fullPath.str);
      } else {
        resetEditing();
      }
    },
    [fullPath.str, resetEditing, setEditing]
  );

  // const { addNode, removeNode } = useFileTreeMenuContext();

  useEffect(() => {
    if (isSelected && inbound === props.href) {
      linkRef?.current?.focus();
      setInbound(null);
    }
  }, [inbound, isSelected, props.href, linkRef, setInbound]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isEditing) {
          //cancel file
          // removeFile(fullPath.str);
        }
        setFileName(fullPath.basename());
        setIsEditing(false);
        resetEditing();
        linkRef.current?.focus();
      }
      if (e.key === "Enter") {
        if (isEditing) {
          setIsEditing(false);
          resetEditing();
          onRename(fullPath.dirname().join(fileName)).then((newPath) => {
            setFileName(newPath.basename());
          });
          linkRef.current?.focus();
        } else {
          setIsEditing(true);
        }
      } else if (e.key === " ") {
        if (!isEditing) {
          e.preventDefault();
          linkRef.current?.click();
        }
      }
    },
    [fullPath, setIsEditing, resetEditing, isEditing, onRename, fileName]
  );

  const handleBlur = useCallback(() => {
    if (isEditing) {
      setIsEditing(false);
      resetEditing();
      //reset to original text
      setFileName(fullPath.basename());
    }
  }, [fullPath, isEditing, resetEditing, setIsEditing]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      linkRef.current?.focus();
      if (pathname === props.href) {
        e.preventDefault();
        return;
      }
      //convert props.href to string
      setInbound(props.href);
    },
    [pathname, props.href, setInbound]
  );

  return (
    <div className="select-none">
      {!isEditing ? (
        <Link
          {...props}
          data-treepath={fullPath.str}
          data-treetype="file"
          className={twMerge(props.className, "group cursor-pointer")}
          ref={linkRef}
          tabIndex={0}
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
