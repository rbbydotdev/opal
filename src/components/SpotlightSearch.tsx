"use client";
import { useWatchWorkspaceFileTree } from "@/context/WorkspaceHooks";
import { FilterOutSpecialDirs } from "@/Db/SpecialDirs";
import { Thumb } from "@/Db/Thumb";
import { Workspace } from "@/Db/Workspace";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { absPath, AbsPath, absPathname, joinPath } from "@/lib/paths2";
import clsx from "clsx";
import fuzzysort from "fuzzysort";
import { FileTextIcon } from "lucide-react";
import mime from "mime-types";
import Link from "next/link";
import React, { forwardRef, JSX, useEffect, useMemo, useRef, useState } from "react";
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
            src={Thumb.pathToURL(absPath(filePath!))}
            alt=""
            className="mr-2 h-6 w-6 flex-shrink-0 border border-black bg-white"
          />
        ) : (
          <div className="w-6 h-6 flex justify-center items-center">
            <FileTextIcon className="mr-1 h-4 w-4 flex-shrink-0 flex-grow-0 text-ring" />
          </div>
        )}
        <div className="min-w-0 truncate text-md font-mono text-sidebar-foreground/70">{title}</div>
      </Link>
    </li>
  );
});
SpotlightSearchItem.displayName = "SpotlightSearchItem";

export function SpotlightSearch({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const filesOnlyFilter = useRef((node: TreeNode) => node.isTreeFile());
  const { flatTree } = useWatchWorkspaceFileTree(currentWorkspace, filesOnlyFilter.current!);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1); // -1 means input is active
  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<Element | null>(null); // To store what element triggered the dialog

  const handleClose = () => {
    setOpen(false);
    setSearch("");
    setActiveIndex(-1);
    // Restore focus to the element that opened the dialog
    if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  };

  const visibleFilesOnly = useMemo(() => {
    return flatTree.filter((file) => FilterOutSpecialDirs(file));
  }, [flatTree]);

  const sortedList = useMemo(() => {
    setActiveIndex(-1); // Reset index on new search results
    if (!search) {
      return visibleFilesOnly.map((file) => ({
        element: <>{file}</>,
        href: file,
      }));
    }
    const results = fuzzysort.go(search, visibleFilesOnly, {
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
  }, [search, visibleFilesOnly]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const menuItems = menuRef.current?.querySelectorAll('[role="menuitem"]');
    const itemsLength = menuItems?.length ?? 0;

    if (e.key === "p" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      inputRef.current?.select();
      return;
    }

    switch (e.key) {
      case "Tab":
        e.preventDefault();
        if (e.shiftKey) {
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
        } else {
          setActiveIndex((prev) => (prev < itemsLength - 1 ? prev + 1 : -1));
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < itemsLength - 1 ? prev + 1 : -1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(-1);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(itemsLength - 1);
        break;
      case " ":
      case "Enter":
        if (activeIndex === -1) return;
        e.preventDefault();
        (menuItems?.[activeIndex] as HTMLAnchorElement)?.click();
        break;
      case "Escape":
        e.preventDefault();
        handleClose();
        break;
    }
  };

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
      inputRef.current?.select();
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
        "absolute left-0 right-0 top-4 z-20 m-auto flex w-[36rem] flex-col items-center justify-center",
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
          className="w-full rounded-lg border-none bg-background p-2 text-md focus:outline-none"
          aria-controls="spotlight-menu"
          aria-haspopup="true"
          aria-activedescendant={activeIndex > -1 ? `spotlight-item-${activeIndex}` : undefined}
        />
      </div>
      {Boolean(sortedList.length) && (
        <ul
          ref={menuRef}
          id="spotlight-menu"
          role="menu"
          aria-labelledby="spotlight-search"
          className="mt-2 block max-h-48 w-full justify-center overflow-scroll rounded-lg bg-background drop-shadow-lg"
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
