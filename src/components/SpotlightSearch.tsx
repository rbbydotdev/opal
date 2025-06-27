"use client";
import { useWatchWorkspaceFileTree } from "@/context/WorkspaceHooks";
import { Thumb } from "@/Db/Thumb";
import { Workspace } from "@/Db/Workspace";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { absPath, AbsPath, absPathname, joinPath } from "@/lib/paths2";
import clsx from "clsx";
import fuzzysort from "fuzzysort";
import { FileTextIcon } from "lucide-react";
import mime from "mime-types";
import Link from "next/link";
import React, { forwardRef, JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { basename } from "../lib/paths2";

const SpotlightSearchItem = forwardRef<
  HTMLAnchorElement,
  {
    id: string;
    href: string | AbsPath;
    title: string | JSX.Element;
    isActive: boolean;
    onClick: () => void;
  }
>(({ id, href, title, isActive, onClick }, ref) => {
  const { filePath } = Workspace.parseWorkspacePath(absPathname(href));

  return (
    // The `li` is for presentation only; the `a` tag is the menu item.
    <li role="presentation" className="flex w-full flex-col rounded p-1">
      <Link
        id={id}
        ref={ref}
        href={href}
        role="menuitem"
        tabIndex={isActive ? 0 : -1} // Roving tabindex implementation
        onClick={onClick}
        onKeyDown={(e) => {
          // `a` tags don't activate on Space by default, so we add it.
          if (e.key === " " || e.key === "Spacebar") {
            e.preventDefault();
            onClick();
          }
        }}
        className="group flex h-8 min-w-0 items-center justify-start rounded-md border-2 border-sidebar bg-sidebar px-2 py-5 outline-none group-hover:border-ring focus:border-ring"
      >
        {(mime.lookup(basename(href)) || "").startsWith("image/") ? (
          <img
            src={Thumb.pathToURL(absPath(filePath || "/"))}
            alt=""
            className="mr-2 h-3 w-3 flex-shrink-0 border border-black bg-white"
          />
        ) : (
          <FileTextIcon className="mr-1 h-3 w-3 flex-shrink-0 flex-grow-0 text-ring" />
        )}
        <div className="min-w-0 truncate text-xs font-mono text-sidebar-foreground/70">{title}</div>
      </Link>
    </li>
  );
});
SpotlightSearchItem.displayName = "SpotlightSearchItem";

export function SpotlightSearch({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const filesOnlyFilter = useRef((node: TreeNode) => node.isTreeFile());
  const { flatTree: fileList } = useWatchWorkspaceFileTree(currentWorkspace, filesOnlyFilter.current!);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1); // -1 means input is active
  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<Element | null>(null); // To store what element triggered the dialog

  const handleClose = useCallback(() => {
    setOpen(false);
    setSearch("");
    setActiveIndex(-1);
    // Restore focus to the element that opened the dialog
    if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }, []);

  const sortedList = useMemo(() => {
    setActiveIndex(-1); // Reset index on new search results
    if (!search) {
      return fileList.slice(0, 10).map((file) => ({
        element: <>{file}</>,
        href: file,
      }));
    }
    const results = fuzzysort.go(search, fileList, {
      // To prevent slow performance on large file lists
      limit: 50,
    });
    return results.map((result) => ({
      element: (
        <>
          {result.highlight((m, i) => (
            <b key={i}>{m}</b>
          ))}
        </>
      ),
      href: result.target,
    }));
  }, [fileList, search]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const menuItems = menuRef.current?.querySelectorAll('[role="menuitem"]');
      if (!menuItems || menuItems.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev < menuItems.length - 1 ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : menuItems.length - 1));
          break;
        case "Home":
          e.preventDefault();
          setActiveIndex(0);
          break;
        case "End":
          e.preventDefault();
          setActiveIndex(menuItems.length - 1);
          break;
        case "Enter":
          // This allows submitting the form if the input is focused
          if (activeIndex === -1) return;
          e.preventDefault();
          (menuItems[activeIndex] as HTMLAnchorElement)?.click();
          break;
        case "Escape":
          e.preventDefault();
          handleClose();
          break;
      }
    },
    [activeIndex, handleClose]
  );

  // Effect to handle opening the search palette
  useEffect(() => {
    const handleOpenKeydown = (e: KeyboardEvent) => {
      if (e.key === "p" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        triggerRef.current = document.activeElement; // Store focus
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handleOpenKeydown);
    return () => window.removeEventListener("keydown", handleOpenKeydown);
  }, []);

  // Effect to manage focus when the component opens or activeIndex changes
  useEffect(() => {
    if (!open) return;

    if (activeIndex === -1) {
      inputRef.current?.focus();
    } else {
      const menuItem = menuRef.current?.querySelector<HTMLAnchorElement>(`#spotlight-item-${activeIndex}`);
      menuItem?.focus();
    }
  }, [open, activeIndex]);

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      className={clsx(
        "absolute left-0 right-0 top-4 z-20 m-auto flex w-96 flex-col items-center justify-center",
        "translate-y-12",
        { "animate-in": open }
      )}
      onKeyDown={handleKeyDown}
      onBlur={(e) => {
        // Close if focus moves outside the component
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
          handleClose();
        }
      }}
    >
      <div className="flex h-12 w-full items-center justify-center rounded-lg border bg-background p-2 text-sidebar-foreground/70 shadow-lg">
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          id="spotlight-search"
          type="text"
          autoComplete="off"
          placeholder="Spotlight Search..."
          className="w-full rounded-lg border-none bg-background p-2 text-sm focus:outline-none"
          aria-controls="spotlight-menu"
          // aria-expanded={open}
          aria-haspopup="true"
          // Points to the active item for screen readers while focus remains on input
          aria-activedescendant={activeIndex > -1 ? `spotlight-item-${activeIndex}` : undefined}
        />
      </div>
      {Boolean(sortedList.length) && (
        <ul
          ref={menuRef}
          id="spotlight-menu"
          role="menu"
          aria-labelledby="spotlight-search"
          className="mt-2 block max-h-48 w-full justify-center overflow-scroll rounded-lg bg-background"
        >
          {sortedList.map((file, index) => {
            return (
              <SpotlightSearchItem
                key={file.href}
                id={`spotlight-item-${index}`}
                isActive={index === activeIndex}
                onClick={handleClose}
                href={joinPath(currentWorkspace.href, file.href)}
                title={file.element}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
