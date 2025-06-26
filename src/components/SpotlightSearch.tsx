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
import { useRouter } from "next/navigation";
import { JSX, useCallback, useEffect, useRef, useState } from "react";
import { basename } from "../lib/paths2";

function SpotlightSearchItem({
  title,
  onNavigate,
  href,
}: {
  href: string | AbsPath;
  title: string | JSX.Element;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const { filePath } = Workspace.parseWorkspacePath(absPathname(href));
  return (
    <li className="rounded flex-col inline-flex w-full p-1">
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          onNavigate?.();
          router.push(href);
        }}
        tabIndex={0}
        onFocus={(e) => e.stopPropagation()}
        className="group min-w-0 flex outline-none justify-start items-center bg-sidebar px-2 py-5 rounded-md h-8 border-sidebar border-2 group-hover:border-ring focus:border-ring"
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Spacebar") {
            e.preventDefault();
            onNavigate?.();
            router.push(href);
          }
        }}
      >
        {(mime.lookup(basename(href)) || "").startsWith("image/") ? (
          <img
            src={Thumb.pathToURL(absPath(filePath || "/"))}
            alt=""
            className="w-3 h-3 border border-black flex-shrink-0 bg-white mr-2"
          />
        ) : (
          <FileTextIcon className="mr-1 flex-grow-0 w-3 h-3 text-ring flex-shrink-0" />
        )}
        <div className="min-w-0 truncate text-xs font-mono text-sidebar-foreground/70">{title}</div>
      </a>
    </li>
  );
}

export function SpotlightSearch({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const filesOnlyFilter = useRef((node: TreeNode) => node.isTreeFile());
  const { flatTree: fileList } = useWatchWorkspaceFileTree(currentWorkspace, filesOnlyFilter.current!);
  const [sortedList, setSortedList] = useState<{ element: JSX.Element | string; href: AbsPath | string }[]>(() =>
    currentWorkspace.getFlatTree().map((text) => ({ element: text, href: text }))
  );
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const router = useRouter();

  const handleBlur = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  const handleArrowNavigation = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    e.preventDefault();
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLAnchorElement>("a[tabindex='0']"));
    const active = document.activeElement;
    let idx = items.findIndex((el) => el === active);
    if (e.key === "ArrowDown") {
      idx = idx < items.length - 1 ? idx + 1 : 0;
    } else if (e.key === "ArrowUp") {
      idx = idx > 0 ? idx - 1 : items.length - 1;
    }
    items[idx]?.focus();
  }, []);

  useEffect(() => {
    return setSortedList(
      fuzzysort.go(search, fileList).map((result) => ({
        element: (
          <>
            {result.highlight((m, i) => (
              <b key={i}>{m}</b>
            ))}
          </>
        ),
        href: result.target,
      }))
    );
  }, [currentWorkspace, fileList, search]);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleBlur();
      }
    };
    if (open) {
      window.addEventListener("keydown", handleKeydown);
      const inputElem = inputRef.current;
      inputElem!.focus();
      return () => {
        window.removeEventListener("keydown", handleKeydown);
      };
    } else {
      window.removeEventListener("keydown", handleKeydown);
    }
  }, [handleBlur, open]);

  useEffect(() => {
    function handleOpenKeydown(e: KeyboardEvent) {
      if (e.key === "p" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", handleOpenKeydown);
    return () => {
      window.removeEventListener("keydown", handleOpenKeydown);
    };
  }, []);
  if (!open) return false;
  return (
    <div
      className={clsx(
        "absolute left-0 right-0 flex-col justify-center items-center m-auto w-96 z-20 top-4",
        "translate-y-12",
        { "animate-in": open }
      )}
      onKeyDown={(e) => {
        if (e.key === "Enter" && sortedList.length > 0) {
          router.push(joinPath(currentWorkspace.href, sortedList[0]!.href));
          handleBlur();
        }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          handleArrowNavigation(e);
        }
      }}
      onMouseDown={(e) => e.preventDefault()} //preventblur
      onBlur={(e) => {
        // Only run handleBlur if the next focused element is outside this container
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          handleBlur();
        }
      }}
    >
      <div
        className={clsx(
          "p-2 border w-full h-12 text-sidebar-foreground/70 shadow-lg bg-background rounded-lg flex justify-center items-center"
        )}
      >
        <input
          ref={inputRef}
          autoFocus
          value={search}
          tabIndex={0}
          onChange={(e) => setSearch(e.target.value)}
          id="spotlight-search"
          type="text"
          autoComplete="off"
          placeholder="Search Files..."
          className="p-2 border focus:outline-none border-none w-full rounded-lg text-sm bg-background"
        />
      </div>
      {Boolean(sortedList.length) && (
        <ul
          tabIndex={-1}
          className="w-full flex-col justify-center mt-2 max-h-48 overflow-scroll rounded-lg bg-background"
          role="menu"
          aria-label="Spotlight search results"
        >
          {sortedList.map((file, index) => (
            <SpotlightSearchItem
              // onNavigate={() => router.push(joinPath(currentWorkspace.href, file.href))}
              onNavigate={handleBlur}
              key={index}
              href={joinPath(currentWorkspace.href, file.href)}
              title={file.element}
            />
          ))}

          <li
            aria-hidden
            tabIndex={0}
            onFocus={() => {
              inputRef.current?.select();
            }}
          ></li>
        </ul>
      )}
    </div>
  );
}
