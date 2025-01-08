"use client";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toPromise } from "@/lib/toPromise";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

export const EditableFile = ({
  children,
  depth,
  isSelected,
  onRename,
  ...props
}: React.ComponentProps<typeof Link> & {
  href: string;
  children: string;
  isSelected: boolean;
  onRename: (newName: string) => Promise<string> | string;
  depth: number;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [linkText, setLinkText] = useState(children);
  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inbound, setInbound] = useLocalStorage<string | null>("EditableLink/inbound", null);
  const pathname = usePathname();

  useEffect(() => {
    if (isSelected && inbound === props.href) {
      linkRef?.current?.focus();
      setInbound(null);
    }
  }, [inbound, isSelected, props.href, linkRef, setInbound]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setLinkText(children);
        setIsEditing(false);
        linkRef.current?.focus();
      }
      if (e.key === "Enter") {
        if (isEditing) {
          setIsEditing(false);
          toPromise(onRename)(linkText).then((newPath) => {
            setLinkText(newPath);
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
    [children, isEditing, linkText, onRename]
  );

  const handleBlur = useCallback(() => {
    if (isEditing) {
      setIsEditing(false);
      //reset to original text
      setLinkText(children);
    }
  }, [children, isEditing]);

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
          className={twMerge(props.className, "group cursor-pointer")}
          ref={linkRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
        >
          <div style={{ marginLeft: depth + 1 + "rem" }}>
            <File selected={isSelected}>
              <span className="py-1.5 group-focus:font-bold">{linkText}</span>
            </File>
          </div>
        </Link>
      ) : (
        <div style={{ marginLeft: depth + 1.5 + "rem" }}>
          <File selected={isSelected}>
            <input
              ref={inputRef}
              className="bg-transparent py-1.5 outline-none font-bold border-b border-dashed border-black"
              type="text"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
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
      className={`items-center flex gap-2 ${selected ? "before:content-[attr(data-star)] before:text-accent2 " : ""}`}
      data-star="✦"
    >
      {children}
    </span>
  );
}
