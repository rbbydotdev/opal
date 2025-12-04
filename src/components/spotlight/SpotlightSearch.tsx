import { useBuildCreation } from "@/components/build-modal/BuildModalContext";
import { useFileTreeMenuCtx } from "@/components/filetree/FileTreeMenuCtxProvider";
import { toast } from "@/components/ui/sonner";
import { WorkspaceIcon } from "@/components/workspace/WorkspaceIcon";
import { useFileTree } from "@/context/FileTreeProvider";
import { useCurrentFilepath, useWorkspaceContext, useWorkspaceRoute } from "@/context/WorkspaceContext";
import { FilterOutSpecialDirs } from "@/data/SpecialDirs";
import { Thumb } from "@/data/Thumb";
import { setViewMode } from "@/editor/view-mode/handleUrlParamViewMode";
import { useRepoInfo } from "@/features/git-repo/useRepoInfo";
import { useWorkspaceGitRepo } from "@/features/git-repo/useWorkspaceGitRepo";
import { useWindowContextProvider } from "@/features/live-preview/IframeContextProvider";
import { ThemePreview } from "@/features/theme/ThemePreview";
import { ALL_WS_KEY } from "@/features/workspace-search/AllWSKey";
import { useWorkspaceFilenameSearchResults } from "@/features/workspace-search/useWorkspaceFilenameSearchResults";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { useTheme } from "@/hooks/useTheme";
import { DefaultFile } from "@/lib/DefaultFile";
import { Workspace } from "@/lib/events/Workspace";
import { absPath, AbsPath, absPathname, basename, joinPath, prefix, strictPrefix } from "@/lib/paths2";
import { cn } from "@/lib/utils";
import type { FileWithWorkspace } from "@/workspace/useAllWorkspaceFiles";
import { useWorkspaceFileMgmt } from "@/workspace/useWorkspaceFileMgmt";
import { Link, useNavigate } from "@tanstack/react-router";
import fuzzysort from "fuzzysort";
import { CommandIcon, FileTextIcon } from "lucide-react";
import mime from "mime-types";
import React, { forwardRef, JSX, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

const SpotlightSearchItemLink = forwardRef<
  HTMLAnchorElement,
  {
    id: string;
    role: string;
    workspaceName?: string;
    tabIndex: number;
    href: string | AbsPath;
    title: string | JSX.Element | React.ReactNode;
    isActive: boolean;
    onSelect: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
  }
>(({ id, role, tabIndex, workspaceName, href, title, onSelect }, ref) => {
  const { filePath } = Workspace.parseWorkspacePath(absPathname(href));

  return (
    <li role="presentation" className="flex w-full flex-col rounded p-1">
      <Link
        id={id}
        ref={ref}
        to={href}
        role={role}
        tabIndex={tabIndex}
        onClick={onSelect}
        className="group flex h-8 min-w-0 items-center justify-start rounded-md border-2 px-2 py-5 outline-none group-hover:border-ring focus:border-ring"
      >
        {(mime.lookup(basename(href)) || "").startsWith("image/") ? (
          <img
            src={Thumb.pathToURL({ path: absPath(filePath!), workspaceName })} //TODO:!
            alt=""
            className="mr-2 h-6 w-6 flex-shrink-0 border border-border bg-foreground"
          />
        ) : (
          <div className="w-6 h-6 flex justify-center items-center">
            <FileTextIcon className="mr-1 h-4 w-4 flex-shrink-0 flex-grow-0 text-ring" />
          </div>
        )}
        <div className="min-w-0 truncate text-md font-mono _text-sidebar-foreground/70">{title}</div>
      </Link>
    </li>
  );
});
SpotlightSearchItemLink.displayName = "SpotlightSearchItemLink";

const SpotlightSearchItemCmd = forwardRef<
  HTMLButtonElement,
  {
    id: string;
    role: string;
    tabIndex: number;
    cmd: string;
    title: string | JSX.Element | React.ReactNode;
    isActive: boolean;
    onSelect: () => void;
  }
>(({ id, role, tabIndex, cmd: _cmd, title, isActive: _isActive, onSelect }, ref) => {
  return (
    <li role="presentation" className="flex w-full flex-col rounded p-1">
      <button
        id={id}
        ref={ref}
        role={role}
        tabIndex={tabIndex}
        onClick={onSelect}
        className="group flex h-8 min-w-0 items-center justify-start rounded-md border-2 px-2 py-5 outline-none group-hover:border-ring focus:border-ring"
      >
        <div className="w-6 h-6 flex justify-center items-center">
          <CommandIcon className="mr-1 h-4 w-4 flex-shrink-0 flex-grow-0 text-ring" />
        </div>
        <div className="min-w-0 truncate text-md font-mono">{title}</div>
      </button>
    </li>
  );
});
SpotlightSearchItemCmd.displayName = "SpotlightSearchItemCmd";

// Workspace-specific spotlight search that uses workspace context
export function WorkspaceSpotlightSearch() {
  const { currentWorkspace } = useWorkspaceContext();
  const { flatTree } = useFileTree();
  const { cmdMap, commands } = useSpotlightCommandPalette({
    currentWorkspace,
  });

  return <SpotlightSearch files={flatTree} commands={commands} cmdMap={cmdMap} basePath={currentWorkspace.href} />;
}

// Generic spotlight search component
export function SpotlightSearch({
  files,
  commands,
  cmdMap,
  basePath,
  commandPrefix = ">",
  placeholder = "Spotlight Search...",
  useFilenameSearch = false,
}: {
  files: AbsPath[] | FileWithWorkspace[];
  commands: string[];
  cmdMap: CmdMap;
  basePath?: AbsPath;
  commandPrefix?: string;
  placeholder?: string;
  useFilenameSearch?: boolean;
}) {
  return createPortal(
    <SpotlightSearchInternal
      basePath={basePath}
      files={files}
      commands={commands}
      cmdMap={cmdMap}
      commandPrefix={commandPrefix}
      placeholder={placeholder}
      useFilenameSearch={useFilenameSearch}
    />,
    document.body
  );
}

// Workspace header component
const WorkspaceHeader = ({ workspaceName }: { workspaceName: string }) => (
  <li className="w-full">
    <div className="sticky top-0 bg-background border-b border-border px-3 py-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
      <WorkspaceIcon input={workspaceName} size={4} scale={6} variant="square" className="border border-border" />
      <span className="font-mono">{workspaceName}</span>
    </div>
  </li>
);

function SpotlightSearchInternal({
  basePath,
  files,
  commandPrefix = ">",
  commands,
  cmdMap,
  placeholder = "Spotlight Search...",
  useFilenameSearch = false,
}: {
  basePath?: AbsPath;
  files: AbsPath[] | FileWithWorkspace[];
  commandPrefix?: string;
  commands: string[];
  cmdMap: CmdMap;
  placeholder?: string;
  useFilenameSearch?: boolean;
}) {
  //MARK: State / hooks
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [deferredSearch, setDeferredSearch] = useState("");
  const [_isPending, startTransition] = useTransition();

  const [state, setState] = useState<"spotlight" | "prompt" | "select">("spotlight");

  // Filename search hook for home spotlight - always call, conditionally use
  const filenameSearchHook = useWorkspaceFilenameSearchResults(150);
  const [promptPlaceholder, setPromptPlaceholder] = useState("Enter value...");
  const [currentPrompt, setCurrentPrompt] = useState<CmdPrompt | CmdSelect | null>(null);

  const triggerRef = useRef<Element | null>(null);

  const execQueue = useRef<CmdMapMember[] | null>(null);
  const execContext = useRef<Record<string, unknown>>({});
  const handleClose = () => {
    setOpen(false);
    setState("spotlight");
    setSearch("");
    setDeferredSearch("");
    resetActiveIndex();
    setCurrentPrompt(null);
    execQueue.current = null;
    execContext.current = {};
    if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  };

  const runNextStep = async () => {
    if (!execQueue.current || execQueue.current.length === 0) {
      handleClose();
      return;
    }
    const step = execQueue.current.shift()!;
    if (isCmdPrompt(step)) {
      setState("prompt");
      setPromptPlaceholder(step.description);
      setCurrentPrompt(step);
      setSearch("");
      inputRef.current?.focus();
    } else if (isCmdSelect(step)) {
      setState("select");
      setPromptPlaceholder(step.description);
      setCurrentPrompt(step);
      setSearch("");
      setDeferredSearch("");
      execContext.current.__selectOptions = step.options;
      inputRef.current?.focus();
    } else if (isCmdExec(step)) {
      if (execQueue.current.length === 0) {
        setOpen(false);
      }
      let aborted = false;
      await step.exec(execContext.current, () => (aborted = true));
      if (aborted) {
        handleClose();
        return;
      }
      return await runNextStep();
    }
  };

  const navigate = useNavigate();
  const handleCommandSelect = (cmd: string) => {
    const members = cmdMap[cmd];
    if (!members) return;
    execQueue.current = [...members];
    execContext.current = {};
    return runNextStep();
  };

  const handleItemSelect = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    itemHref: string,
    targetHref: string
  ) => {
    e.preventDefault();

    if (state === "select") {
      e.stopPropagation();
      execContext.current[currentPrompt!.name] = itemHref;
      setSearch("");
      setState("spotlight");
      setCurrentPrompt(null);
      void runNextStep();
    } else {
      // window.location.href = targetHref;
      void navigate({ to: targetHref });

      // reloadDocument: false,
      handleClose();
    }
  };

  const isFileWithWorkspace = (file: any): file is FileWithWorkspace => {
    return file && typeof file === "object" && "path" in file && "workspaceName" in file;
  };

  const visibleFiles = useMemo(() => {
    if (files.length === 0) return [];

    // Handle FileWithWorkspace[] case
    if (isFileWithWorkspace(files[0])) {
      return (files as FileWithWorkspace[]).filter((file) => FilterOutSpecialDirs(file.path));
    }

    // Handle AbsPath[] case
    return (files as AbsPath[]).filter((file) => FilterOutSpecialDirs(file)).map((path) => ({ path }));
  }, [files]);

  const commandList = useMemo(() => {
    return commands.map((cmd) => `${commandPrefix} ${cmd}`);
  }, [commandPrefix, commands]);

  // Calculate sorted list using useMemo instead of useState
  const sortedList = useMemo(() => {
    // MARK: Handle select state
    if (state === "select" && currentPrompt && "options" in currentPrompt) {
      const selectPrompt = currentPrompt as any;
      const options = selectPrompt.options as string[];
      const renderItem = selectPrompt.renderItem as ((option: string) => React.ReactNode) | undefined;
      if (!deferredSearch.trim()) {
        return options.map((opt) => ({
          element: renderItem ? renderItem(opt) : opt,
          href: opt,
        }));
      }

      return fuzzysort.go(deferredSearch, options, { limit: 50 }).map((result) => ({
        element: renderItem ? (
          renderItem(result.target)
        ) : (
          <>
            {result.highlight((m, i) => (
              <b className="text-ring" key={i}>
                {m}
              </b>
            ))}
          </>
        ),
        href: result.target,
      }));
    }

    if (!deferredSearch.trim()) {
      // MARK: Spotlight state - show results from filename search or local files
      if (useFilenameSearch && filenameSearchHook && filenameSearchHook.hasResults) {
        // Show filename search results grouped by workspace
        const result: any[] = [];
        filenameSearchHook.workspaceResults.forEach(([workspaceName, results]) => {
          if (results.length > 0) {
            result.push({ type: "header", workspaceName });
            result.push(
              ...results.slice(0, 10).map((fileResult) => ({
                element: <>{fileResult.filename}</>,
                href: fileResult.filePath,
                workspaceName: fileResult.workspaceName,
                workspaceHref: `/workspace/${fileResult.workspaceName}`,
              }))
            );
          }
        });
        return result;
      }

      // MARK: Original local files logic
      const hasWorkspaceInfo = visibleFiles.length > 0 && visibleFiles[0] && "workspaceName" in visibleFiles[0];

      if (hasWorkspaceInfo) {
        // Group files by workspace
        const grouped = (visibleFiles as FileWithWorkspace[]).reduce(
          (acc, file) => {
            if (!acc[file.workspaceName]) {
              acc[file.workspaceName] = [];
            }
            acc[file.workspaceName]!.push(file);
            return acc;
          },
          {} as Record<string, FileWithWorkspace[]>
        );

        const result: any[] = [];
        Object.entries(grouped).forEach(([workspaceName, workspaceFiles]) => {
          if (workspaceFiles.length > 0) {
            result.push({ type: "header", workspaceName });
            result.push(
              ...workspaceFiles.slice(0, 10).map((file) => ({
                element: <>{basename(file.path)}</>,
                href: file.path,
                workspaceName: file.workspaceName,
                workspaceHref: file.workspaceHref,
              }))
            );
          }
        });
        return result;
      } else {
        // Simple file list for workspace context
        return visibleFiles.map((file) => ({
          element: <>{basename(file.path)}</>,
          href: file.path,
        }));
      }
    } else {
      // Search with grouping - check for filename search first
      if (useFilenameSearch && filenameSearchHook && deferredSearch && !deferredSearch.startsWith(commandPrefix)) {
        // Show filename search results
        const result: any[] = [];
        filenameSearchHook.workspaceResults.forEach(([workspaceName, results]) => {
          if (results.length > 0) {
            result.push({ type: "header", workspaceName });
            result.push(
              ...results.map((fileResult) => ({
                element: <>{fileResult.filename}</>,
                href: fileResult.filePath,
                workspaceName: fileResult.workspaceName,
                workspaceHref: `/workspace/${fileResult.workspaceName}`,
              }))
            );
          }
        });
        return result;
      }

      // Original search logic for workspace files
      const hasWorkspaceInfo = visibleFiles.length > 0 && visibleFiles[0] && "workspaceName" in visibleFiles[0];
      const searchTargets = deferredSearch.startsWith(commandPrefix) ? commandList : visibleFiles.map((f) => f.path);

      const searchResults = fuzzysort.go(deferredSearch, searchTargets, { limit: 50 });

      // MARK: command palette
      if (deferredSearch.startsWith(commandPrefix)) {
        return searchResults.map((result) => ({
          element: (
            <>
              {result.highlight((m, i) => (
                <b className="text-ring" key={i}>
                  {m}
                </b>
              ))}
            </>
          ),
          href: result.target,
        }));
      } else if (hasWorkspaceInfo) {
        //MARK: workspace search
        // Group search results by workspace
        const groupedResults = searchResults.reduce(
          (acc, result) => {
            const file = (visibleFiles as FileWithWorkspace[]).find((f) => f.path === result.target);
            if (!file) return acc;

            if (!acc[file.workspaceName]) {
              acc[file.workspaceName] = [];
            }
            acc[file.workspaceName]!.push({
              element: (
                <>
                  {result.highlight((m, i) => (
                    <b className="text-ring" key={i}>
                      {m}
                    </b>
                  ))}
                </>
              ),
              href: result.target,
              workspaceName: file.workspaceName,
              workspaceHref: file.workspaceHref,
            });
            return acc;
          },
          {} as Record<string, any[]>
        );

        const result: any[] = [];
        Object.entries(groupedResults).forEach(([workspaceName, workspaceFiles]) => {
          if (workspaceFiles.length > 0) {
            result.push({ type: "header", workspaceName });
            result.push(...workspaceFiles);
          }
        });
        return result;
      } else {
        // Simple search for workspace context
        return searchResults.map((result) => ({
          element: (
            <>
              {result.highlight((m, i) => (
                <b className="text-ring" key={i}>
                  {m}
                </b>
              ))}
            </>
          ),
          href: result.target,
        }));
      }
    }
  }, [
    state,
    currentPrompt,
    deferredSearch,
    useFilenameSearch,
    filenameSearchHook,
    visibleFiles,
    commandPrefix,
    commandList,
  ]);
  //MARK: Navigation
  // Calculate navigable items (exclude headers) to map activeIndex correctly
  const navigableItems = useMemo(() => {
    return sortedList.filter((item) => item.type !== "header");
  }, [sortedList]);

  // Keyboard navigation hook
  const {
    activeIndex,
    resetActiveIndex,
    containerRef,
    inputRef,
    menuRef,
    handleKeyDown: baseHandleKeyDown,
    getInputProps,
    getMenuProps,
    getItemProps,
  } = useKeyboardNavigation({
    onEnter: (activeIndex) => {
      // Only handle spotlight state - let existing logic handle prompt/select
      if (state === "spotlight") {
        const menuItems = menuRef.current?.querySelectorAll('[role="menuitem"]')!;
        if (activeIndex >= 0 && activeIndex < menuItems.length) {
          (menuItems[activeIndex] as HTMLElement)?.click();
        }
      }
    },
    onEscape: handleClose,
    searchValue: search,
    onSearchChange: (value) => {
      setSearch(value);
      startTransition(() => {
        setDeferredSearch(value);
      });
    },
    wrapAround: true,
  });

  // Track last search to avoid duplicate searches
  const lastSearchRef = useRef<string>("");

  // Trigger filename search when using filename search mode
  useEffect(() => {
    // Only trigger when in spotlight state and not typing commands
    if (
      useFilenameSearch &&
      state === "spotlight" &&
      deferredSearch !== lastSearchRef.current &&
      !deferredSearch.startsWith(commandPrefix)
    ) {
      lastSearchRef.current = deferredSearch;
      if (deferredSearch) {
        filenameSearchHook.submit({
          workspaceName: ALL_WS_KEY,
          searchTerm: deferredSearch,
        });
      } else {
        // Clear search when empty
        filenameSearchHook.resetSearch();
      }
    }
  }, [useFilenameSearch, state, deferredSearch, commandPrefix, filenameSearchHook]);

  // Reset active index only when search terms change, not when sortedList reference changes
  useEffect(() => {
    resetActiveIndex();
  }, [deferredSearch, state, resetActiveIndex]);

  //MARK: Handlers

  // Custom key handler that wraps the base handler for Cmd+P support and handles prompt/select states
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle Enter key for prompt and select states before delegating to base handler
    if (e.key === "Enter") {
      if (state === "prompt" && currentPrompt) {
        e.preventDefault();
        execContext.current[currentPrompt.name] = search;
        setSearch("");
        setState("spotlight");
        setCurrentPrompt(null);
        return runNextStep();
      }
      if (state === "select" && currentPrompt) {
        e.preventDefault();
        const selected = navigableItems[activeIndex]?.href;
        if (selected) {
          execContext.current[currentPrompt.name] = selected;
          setSearch("");
          setState("spotlight");
          setCurrentPrompt(null);
          return runNextStep();
        }
      }
      // For spotlight state, let the base handler deal with it
    }

    // Handle Cmd+P / Ctrl+P when not focused on input
    if (document.activeElement !== inputRef.current) {
      if (e.key === "p" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        inputRef.current?.focus();
        return;
      }
    }

    // Delegate to the base handler from the hook
    baseHandleKeyDown(e);
  };

  useEffect(() => {
    const handleOpenKeydown = (e: KeyboardEvent) => {
      if (e.key === "p" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        triggerRef.current = document.activeElement;
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handleOpenKeydown);
    return () => window.removeEventListener("keydown", handleOpenKeydown);
  }, []);

  // Focus input when spotlight opens
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [inputRef, open]);

  if (!open) return null;

  // MARK: Render
  return (
    <>
      {createPortal(<div className="inset-0 absolute backdrop-blur-sm"></div>, document.body)}
      <div
        ref={containerRef}
        className={cn(
          "rounded-lg absolute left-0 right-0 top-4 z-50 m-auto flex w-[36rem] flex-col items-center justify-center",
          "translate-y-12",
          { "animate-in": open }
        )}
        style={{
          boxShadow: "2px 4px 12px 0 oklch(var(--foreground))",
        }}
        onKeyDown={handleKeyDown}
        onBlur={(e) => {
          if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            handleClose();
          }
        }}
      >
        <div className="flex h-12 w-full items-center justify-center rounded-lg border bg-background p-2 shadow-lg relative">
          <input
            {...getInputProps()}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              startTransition(() => {
                setDeferredSearch(e.target.value);
              });
            }}
            id="spotlight-search"
            type="text"
            autoComplete="off"
            placeholder={
              state === "prompt" || state === "select"
                ? promptPlaceholder
                : false
                  ? "Search files across all workspaces..."
                  : placeholder
            }
            className="w-full rounded-lg border-none bg-background p-2 text-md focus:outline-none"
          />
          {useFilenameSearch &&
            filenameSearchHook.isSearching &&
            deferredSearch &&
            !deferredSearch.startsWith(commandPrefix) && (
              <div className="absolute right-3 text-xs text-muted-foreground">Searching...</div>
            )}
        </div>
        {(state === "spotlight" || state === "select") && Boolean(sortedList.length) && (
          <ul
            {...getMenuProps()}
            aria-labelledby="spotlight-search"
            className="mt-2 block max-h-96 w-full justify-center overflow-scroll rounded-lg bg-background drop-shadow-lg"
          >
            {sortedList.map((item, displayIndex) => {
              // Render workspace headers (non-interactive)
              if (item.type === "header") {
                return <WorkspaceHeader key={`header-${item.workspaceName}`} workspaceName={item.workspaceName} />;
              }

              // Calculate the navigable index for this item (excluding headers before it)
              const navigableIndex = sortedList
                .slice(0, displayIndex)
                .filter((prevItem) => prevItem.type !== "header").length;

              if (state === "spotlight" && item.href.startsWith(commandPrefix)) {
                return (
                  <SpotlightSearchItemCmd
                    key={`cmd-${item.href}`}
                    {...getItemProps(navigableIndex)}
                    cmd={item.href}
                    title={item.element}
                    isActive={navigableIndex === activeIndex}
                    onSelect={() => handleCommandSelect(item.href.replace(commandPrefix, "").trim())}
                  />
                );
              }

              // Determine the correct href for navigation
              const targetHref = (() => {
                if (state === "select") {
                  return item.href as AbsPath;
                }
                // For home spotlight with workspace files
                if (item.workspaceHref) {
                  return joinPath(item.workspaceHref, item.href);
                }
                // For workspace spotlight
                if (basePath) {
                  return joinPath(basePath, item.href);
                }
                // Fallback
                return item.href;
              })();

              return (
                <SpotlightSearchItemLink
                  key={item.workspaceName ? `${item.workspaceName}-${item.href}` : item.href}
                  {...getItemProps(navigableIndex)}
                  workspaceName={item.workspaceName}
                  isActive={navigableIndex === activeIndex}
                  onSelect={(e: any) => handleItemSelect(e, item.href, targetHref)}
                  href={targetHref}
                  title={item.element}
                />
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

//
// ---- Types ----
//
type CmdMapMember = CmdPrompt | CmdExec | CmdSelect;

export type CmdMap = {
  [key: string]: CmdMapMember[];
};

type CmdPrompt = {
  name: string;
  description: string;
  type: "prompt";
};

type CmdExec = {
  exec: (context: Record<string, unknown>, abort: () => void) => (void | boolean) | Promise<void | boolean>;
  type: "exec";
};

type CmdSelect = {
  name: string;
  description: string;
  options: string[];
  type: "select";
  renderItem?: (option: string) => React.ReactNode;
};

//
// ---- Constructors ----
//
const NewCmdExec = (exec: (context: Record<string, unknown>, abort: () => void) => void | Promise<void>): CmdExec => ({
  exec,
  type: "exec",
});

const NewCmdPrompt = (name: string, description: string): CmdPrompt => ({
  name,
  description,
  type: "prompt",
});

const NewCmdSelect = (
  name: string,
  description: string,
  options: string[],
  renderItem?: (option: string) => React.ReactNode
): CmdSelect => ({
  name,
  description,
  options,
  type: "select",
  renderItem,
});

//
// ---- Type Guards ----
//
function isCmdPrompt(cmd: CmdMapMember): cmd is CmdPrompt {
  return cmd.type === "prompt";
}
function isCmdExec(cmd: CmdMapMember): cmd is CmdExec {
  return cmd.type === "exec";
}
function isCmdSelect(cmd: CmdMapMember): cmd is CmdSelect {
  return cmd.type === "select";
}

function useSpotlightCommandPalette({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const { newFile, newDir, renameDirOrFile, trashFile } = useWorkspaceFileMgmt(currentWorkspace);
  // const { repo, playbook } = useMemo(
  //   () => ({ repo: currentWorkspace.getRepo(), playbook: currentWorkspace.getPlaybook() }),
  //   [currentWorkspace]
  // );
  const { repo, playbook } = useWorkspaceGitRepo({ currentWorkspace });
  const { focused } = useFileTreeMenuCtx();
  const { path: currentPath, name: workspaceName } = useWorkspaceRoute();
  const { isMarkdown } = useCurrentFilepath();
  const navigate = useNavigate();

  const { open: openPreview } = useWindowContextProvider();
  const { mode, setTheme, setMode, availableThemes, themeName: currentTheme } = useTheme();
  const { openNew } = useBuildCreation();

  const cmdMap = useMemo(
    () =>
      ({
        //MARK: Navigation Commands
        "New Workspace": [
          NewCmdExec(() => {
            void navigate({
              to: "/newWorkspace",
            });
          }),
        ],
        Home: [
          NewCmdExec(() => {
            void navigate({
              to: "/",
            });
          }),
        ],

        // MARK: Build/Publish Commands
        "Build to HTML": [
          NewCmdExec(() => {
            void openNew();
          }),
        ],

        // MARK: Editor Commands

        "Open External Preview": [
          NewCmdExec(() => {
            if (workspaceName) {
              openPreview();
            }
          }),
        ],

        //
        // MARK: File Commands
        //
        "Rename Current File": [
          NewCmdPrompt("new_name", "Enter new file name"),
          NewCmdExec(async (context) => {
            const newName = context.new_name as string;
            if (!newName) {
              console.warn("No new name provided for renaming");
              return;
            }
            if (!currentPath) {
              console.warn("No current path available for renaming");
              return;
            }
            const currentFile = currentWorkspace.nodeFromPath(currentPath);
            if (!currentFile) {
              console.warn("Current file not found");
              return;
            }
            const wantPath = currentFile.copy().renameStrictPrefix(newName).toString();
            await renameDirOrFile(currentFile, wantPath);
          }),
        ],
        "New Mustache Template": [
          NewCmdPrompt("mustache_file_name", "Enter Mustache template file name"),
          NewCmdExec(async (context) => {
            const name = context.mustache_file_name as string;
            if (!name) {
              console.warn("No file name provided for new Mustache template");
              return;
            }
            const fileName = absPath(strictPrefix(name) + ".mustache");
            const dir =
              currentWorkspace.nodeFromPath(focused || currentPath || ("/" as AbsPath))?.closestDirPath() ??
              ("/" as AbsPath);
            const path = await newFile(joinPath(dir, fileName), DefaultFile.Mustache());
            if (path) {
              void navigate({
                to: currentWorkspace.resolveFileUrl(path),
              });
            }
          }),
        ],
        "New Style CSS": [
          NewCmdExec(async () => {
            const path = await newFile(absPath("styles.css"));
            if (path) {
              void navigate({
                to: currentWorkspace.resolveFileUrl(path),
              });
            }
          }),
        ],
        "New EJS Template": [
          NewCmdPrompt("ejs_file_name", "Enter EJS template file name"),
          NewCmdExec(async (context) => {
            const name = context.ejs_file_name as string;
            if (!name) {
              console.warn("No file name provided for new EJS template");
              return;
            }
            const fileName = absPath(strictPrefix(name) + ".ejs");
            const dir =
              currentWorkspace.nodeFromPath(focused || currentPath || ("/" as AbsPath))?.closestDirPath() ??
              ("/" as AbsPath);
            const path = await newFile(joinPath(dir, fileName), DefaultFile.EJS());
            if (path) {
              void navigate({
                to: currentWorkspace.resolveFileUrl(path),
              });
            }
          }),
        ],
        "Trash File": [
          NewCmdExec(async () => {
            if (!currentPath) {
              console.warn("No current file to trash");
              return;
            }
            await trashFile(currentPath);
          }),
        ],

        // Jump Search command removed from workspace view

        "New Dir": [
          NewCmdPrompt("dir_name", "Enter new directory name"),
          NewCmdExec(async (context) => {
            const name = context.dir_name as string;
            if (!name) {
              console.warn("No directory name provided");
              return;
            }
            const dir =
              currentWorkspace.nodeFromPath(currentPath || ("/" as AbsPath))?.closestDirPath() ?? ("/" as AbsPath);
            const dirName = joinPath(dir, prefix(basename(name || "newdir")));
            const path = await newDir(absPath(strictPrefix(dirName)));
            console.debug("New directory created at:", path);
          }),
        ],

        "New Markdown File": [
          NewCmdPrompt("markdown_file_name", "Enter markdown file name"),
          NewCmdExec(async (context) => {
            const name = context.markdown_file_name as string;
            if (!name) {
              console.warn("No file name provided for new markdown file");
              return;
            }
            const fileName = absPath(strictPrefix(name) + ".md");
            const dir =
              currentWorkspace.nodeFromPath(focused || currentPath || ("/" as AbsPath))?.closestDirPath() ??
              ("/" as AbsPath);
            const path = await newFile(joinPath(dir, fileName), DefaultFile.MarkdownFromPath(fileName));
            if (path) {
              void navigate({
                to: currentWorkspace.resolveFileUrl(path),
              });
            }
          }),
        ],

        //
        // MARK: View Mode Commands ---
        //
        "Source View": [
          NewCmdExec(async () => {
            setViewMode("source", "hash");
          }),
        ],
        "Rich Text View": [
          NewCmdExec(async () => {
            setViewMode("rich-text", "hash");
          }),
        ],

        //
        // MARK: Git Commands
        //
        "Git Initialize Repo": [
          NewCmdExec(async () => {
            await playbook.initialCommit();
            toast({
              title: "Git repository initialized",
              description: "A new Git repository has been initialized in this workspace.",
              type: "success",
              position: "top-right",
            });
          }),
        ],
        "Git Merge Commit": [
          NewCmdExec(async () => {
            if (!repo.getInfo()?.fullInitialized) {
              console.warn("Git repository is not initialized");
              return;
            }
            await playbook.mergeCommit();
          }),
        ],
        "Git Commit": [
          NewCmdExec(async (_context, abort) => {
            if (!repo.getInfo()?.hasChanges) {
              toast({
                title: "No changes to commit",
                description: "There are no changes in the repository to commit.",
                type: "info",
                position: "top-right",
              });
              return abort();
            }
          }),
          NewCmdPrompt("git_commit_msg", "Enter Git Commit Message"),
          NewCmdExec(async (context) => {
            const message = context.git_commit_msg as string;
            if (!repo.getInfo()?.fullInitialized) {
              console.warn("Git repository is not initialized");
              return;
            }
            if (!message) {
              console.warn("No commit message provided");
              return;
            }
            await playbook.addAllCommit({ message });

            toast({
              title: "Commit successful",
              description: message ? `Committed changes: "${message}"` : "Committed changes",
              type: "success",
              position: "top-right",
            });
          }),
        ],

        //
        // MARK: Theme Commands ---
        //
        "Toggle Light/Dark Mode": [
          NewCmdExec(() => {
            setMode(mode === "light" ? "dark" : "light");
            toast({
              title: `Switched to ${mode === "light" ? "dark" : "light"} mode`,
              type: "success",
              position: "top-right",
            });
          }),
        ],

        "Select Theme": [
          NewCmdSelect("theme", "Select a theme", availableThemes, (themeName) => (
            <ThemePreview themeName={themeName} currentTheme={currentTheme} />
          )),
          NewCmdExec(async (context) => {
            const selectedTheme = context.theme as string;
            setTheme(selectedTheme);
            toast({
              title: `Applied theme: ${selectedTheme}`,
              type: "success",
              position: "top-right",
            });
          }),
        ],
      }) as const,
    [
      availableThemes,
      currentPath,
      currentTheme,
      currentWorkspace,
      focused,
      mode,
      navigate,
      newDir,
      newFile,
      openNew,
      openPreview,
      playbook,
      renameDirOrFile,
      repo,
      setMode,
      setTheme,
      trashFile,
      workspaceName,
    ]
  );

  //
  // --- Filtering based on context ---
  //
  const gitRepoInfo = useRepoInfo(repo);

  const filterOutKeys = useMemo(() => {
    const cmds = new Set<keyof typeof cmdMap>();
    const currentFile = currentWorkspace.nodeFromPath(currentPath);
    if (!currentFile?.isTreeFile()) {
      cmds.add("Rename Current File");
      cmds.add("Trash File");
      // cmds.add("Open External Preview");
    }
    if (!isMarkdown) {
      cmds.add("Rich Text View");
      cmds.add("Source View");
    }
    if (gitRepoInfo.fullInitialized) {
      cmds.add("Git Initialize Repo");
    }
    if (!gitRepoInfo.fullInitialized) {
      cmds.add("Git Commit");
    }
    if (!gitRepoInfo.conflictingFiles.length || !gitRepoInfo.fullInitialized) {
      cmds.add("Git Merge Commit");
    }
    return cmds;
  }, [currentWorkspace, currentPath, isMarkdown, gitRepoInfo.fullInitialized, gitRepoInfo.conflictingFiles.length]);

  const filteredCmds = useMemo(() => {
    return Object.entries(cmdMap)
      .filter(([key]) => !filterOutKeys.has(key))
      .reduce((acc, [key, value]) => {
        // @ts-ignore
        acc[key] = value;
        return acc;
      }, {} as CmdMap);
  }, [cmdMap, filterOutKeys]);

  return { cmdMap: filteredCmds, commands: Object.keys(filteredCmds) };
}
