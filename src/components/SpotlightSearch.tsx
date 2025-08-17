import { FileOnlyFilter, useWatchWorkspaceFileTree } from "@/context/WorkspaceHooks";
import { FilterOutSpecialDirs } from "@/Db/SpecialDirs";
import { Thumb } from "@/Db/Thumb";
import { Workspace } from "@/Db/Workspace";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { absPath, AbsPath, absPathname, joinPath } from "@/lib/paths2";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import fuzzysort from "fuzzysort";
import { CommandIcon, FileTextIcon } from "lucide-react";
import mime from "mime-types";
import React, { forwardRef, JSX, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { basename } from "../lib/paths2";

const SpotlightSearchItemLink = forwardRef<
  HTMLAnchorElement,
  {
    id: string;
    href: string | AbsPath;
    title: string | JSX.Element;
    isActive: boolean;
    onSelect: () => void;
  }
>(({ id, href, title, isActive, onSelect }, ref) => {
  const { filePath } = Workspace.parseWorkspacePath(absPathname(href));

  return (
    <li role="presentation" className="flex w-full flex-col rounded p-1">
      <Link
        id={id}
        ref={ref}
        to={href}
        role="menuitem"
        tabIndex={isActive ? 0 : -1} // Roving tabindex implementation
        onClick={onSelect}
        onKeyDown={(e) => {
          // `a` tags don't activate on Space by default, so we add it.
          if (e.key === " " || e.key === "Spacebar") {
            e.preventDefault();
            onSelect();
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
SpotlightSearchItemLink.displayName = "SpotlightSearchItemLink";

const SpotlightSearchItemCmd = forwardRef<
  HTMLButtonElement,
  {
    id: string;
    cmd: string;
    title: string | JSX.Element;
    isActive: boolean;
    onSelect: () => void;
  }
>(({ id, cmd: _cmd, title, isActive, onSelect }, ref) => {
  return (
    <li role="presentation" className="flex w-full flex-col rounded p-1">
      <button
        id={id}
        ref={ref}
        role="menuitem"
        tabIndex={isActive ? 0 : -1} // Roving tabindex implementation
        onClick={onSelect}
        onKeyDown={(e) => {
          // `a` tags don't activate on Space by default, so we add it.
          if (e.key === " " || e.key === "Spacebar") {
            e.preventDefault();
            onSelect();
          }
        }}
        className="group flex h-8 min-w-0 items-center justify-start rounded-md border-2 border-sidebar bg-sidebar px-2 py-5 outline-none group-hover:border-ring focus:border-ring"
      >
        <div className="w-6 h-6 flex justify-center items-center">
          <CommandIcon className="mr-1 h-4 w-4 flex-shrink-0 flex-grow-0 text-ring" />
        </div>
        <div className="min-w-0 truncate text-md font-mono text-sidebar-foreground/70">{title}</div>
      </button>
    </li>
  );
});
SpotlightSearchItemLink.displayName = "SpotlightSearchItem";

function useCommandPalette({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const { newFile, newDir } = useWorkspaceFileMgmt(currentWorkspace);
  const cmdMap = useMemo(
    () => ({
      "New Markdown File": () => newFile(absPath("newfile.md")),
      "New Style CSS": () => newFile(absPath("styles.css")),
      "New Dir": () => newDir(absPath("newdir")),
    }),
    [newDir, newFile]
  );
  const execCommand = (cmd: keyof typeof cmdMap) => {
    if (cmdMap[cmd]) {
      void cmdMap[cmd]();
    } else {
      console.warn(`Command "${cmd}" not found`);
    }
  };
  return { execCommand, commands: Object.keys(cmdMap) as (keyof typeof cmdMap)[] };
}
export function SpotlightSearch({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const { flatTree } = useWatchWorkspaceFileTree(currentWorkspace, FileOnlyFilter);
  const { execCommand, commands } = useCommandPalette({ currentWorkspace });

  return createPortal(
    <SpotlightSearchInternal
      basePath={currentWorkspace.href}
      files={flatTree}
      commands={commands}
      onCommandSelect={(cmd) => {
        execCommand(cmd as any);
      }}
      commandPrefix={">"}
    />,
    document.body
  );
}
function SpotlightSearchInternal({
  basePath,
  files,
  commandPrefix = ">",
  onCommandSelect,
  commands,
}: {
  basePath: AbsPath;
  files: AbsPath[];
  commandPrefix?: string;
  onCommandSelect: (command: string) => void;
  commands: string[];
}) {
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

  const visibleFiles = useMemo(() => {
    return [...files.filter((file) => FilterOutSpecialDirs(file))];
  }, [files]);

  const commandList = useMemo(() => {
    return commands.map((cmd) => commandPrefix + cmd);
  }, [commandPrefix, commands]);

  const sortedList = useMemo(() => {
    setActiveIndex(-1); // Reset index on new search results
    if (!search) {
      return visibleFiles.map((file) => ({
        element: <>{file}</>,
        href: file,
      }));
    }
    const results = fuzzysort.go(search, search.startsWith(commandPrefix) ? commandList : visibleFiles, {
      // limit: 50,
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
  }, [commandList, commandPrefix, search, visibleFiles]);

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
          onKeyDown={(e) => {
            if (e.key === "Enter" && activeIndex === -1) {
              //if first item, select first item in the list
              if (sortedList.length > 0) {
                setActiveIndex(0);
              }
            }
          }}
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
          {sortedList.map((item, index) => {
            if (item.href.startsWith(commandPrefix)) {
              return (
                <SpotlightSearchItemCmd
                  key={item.href}
                  id={`spotlight-item-${index}`}
                  cmd={item.href}
                  title={item.element}
                  isActive={index === activeIndex}
                  onSelect={() => {
                    handleClose();
                    onCommandSelect(item.href.replace(commandPrefix, ""));
                  }}
                />
              );
            }
            return (
              <SpotlightSearchItemLink
                key={item.href}
                id={`spotlight-item-${index}`}
                isActive={index === activeIndex}
                onSelect={handleClose}
                href={joinPath(basePath, item.href)}
                title={item.element}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
