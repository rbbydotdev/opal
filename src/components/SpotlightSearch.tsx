import { setViewMode } from "@/components/Editor/view-mode/handleUrlParamViewMode";
import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { useWorkspacePathPreviewURL } from "@/components/ScrollSync";
import { toast } from "@/components/ui/sonner";
import { useCurrentFilepath, useWorkspaceRoute } from "@/context/WorkspaceContext";
import { FilterOutSpecialDirs } from "@/Db/SpecialDirs";
import { Thumb } from "@/Db/Thumb";
import { Workspace } from "@/Db/Workspace";
import { useRepoInfo } from "@/features/git-repo/useRepoInfo";
import { useTheme } from "@/hooks/useTheme";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { absPath, AbsPath, absPathname, basename, joinPath, prefix, strictPrefix } from "@/lib/paths2";
import { type ThemeRegistry, getThemePreviewPalette } from "@/theme/theme-lib";
import themeRegistry from "@/theme/themes.json";
import { Link, useNavigate } from "@tanstack/react-router";
import clsx from "clsx";
import fuzzysort from "fuzzysort";
import { CommandIcon, FileTextIcon } from "lucide-react";
import mime from "mime-types";
import React, { forwardRef, JSX, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useFileTree } from "../context/FileTreeProvider";
import { useWorkspaceContext } from "../context/WorkspaceContext";

const SpotlightSearchItemLink = forwardRef<
  HTMLAnchorElement,
  {
    id: string;
    href: string | AbsPath;
    title: string | JSX.Element | React.ReactNode;
    isActive: boolean;
    onSelect: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
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
        tabIndex={isActive ? 0 : -1}
        onClick={onSelect}
        className="group flex h-8 min-w-0 items-center justify-start rounded-md border-2 _border-sidebar _bg-sidebar px-2 py-5 outline-none group-hover:border-ring focus:border-ring"
      >
        {(mime.lookup(basename(href)) || "").startsWith("image/") ? (
          <img
            src={Thumb.pathToURL(absPath(filePath!))}
            alt=""
            className="mr-2 h-6 w-6 flex-shrink-0 border border-border bg-white"
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
    cmd: string;
    title: string | JSX.Element | React.ReactNode;
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
        tabIndex={isActive ? 0 : -1}
        onClick={onSelect}
        className="group flex h-8 min-w-0 items-center justify-start rounded-md border-2 _border-sidebar _bg-sidebar px-2 py-5 outline-none group-hover:border-ring focus:border-ring"
      >
        <div className="w-6 h-6 flex justify-center items-center">
          <CommandIcon className="mr-1 h-4 w-4 flex-shrink-0 flex-grow-0 text-ring" />
        </div>
        <div className="min-w-0 truncate text-md font-mono _text-sidebar-foreground/70">{title}</div>
      </button>
    </li>
  );
});
SpotlightSearchItemCmd.displayName = "SpotlightSearchItemCmd";

export function SpotlightSearch() {
  const { currentWorkspace } = useWorkspaceContext();
  const { flatTree } = useFileTree();
  const { cmdMap, commands } = useSpotlightCommandPalette({
    currentWorkspace,
  });

  return createPortal(
    <SpotlightSearchInternal
      basePath={currentWorkspace.href}
      files={flatTree}
      commands={commands}
      cmdMap={cmdMap}
      commandPrefix={">"}
    />,
    document.querySelector("#spotlight-slot") ?? document.body
  );
}

function SpotlightSearchInternal({
  basePath,
  files,
  commandPrefix = ">",
  commands,
  cmdMap,
}: {
  basePath: AbsPath;
  files: AbsPath[];
  commandPrefix?: string;
  commands: string[];
  cmdMap: CmdMap;
}) {
  //MARK: State / hooks
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [deferredSearch, setDeferredSearch] = useState(""); // NEW
  const [_isPending, startTransition] = useTransition(); // NEW

  const [activeIndex, setActiveIndex] = useState(-1);
  const [state, setState] = useState<"spotlight" | "prompt" | "select">("spotlight");
  const [promptPlaceholder, setPromptPlaceholder] = useState("Enter value...");
  const [currentPrompt, setCurrentPrompt] = useState<CmdPrompt | CmdSelect | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<Element | null>(null);

  const execQueue = useRef<CmdMapMember[] | null>(null);
  const execContext = useRef<Record<string, unknown>>({});

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

  const handleCommandSelect = (cmd: string) => {
    const members = cmdMap[cmd];
    if (!members) return;
    execQueue.current = [...members];
    execContext.current = {};
    return runNextStep();
  };

  const handleClose = () => {
    setOpen(false);
    setState("spotlight");
    setSearch("");
    setDeferredSearch("");
    setActiveIndex(-1);
    setCurrentPrompt(null);
    execQueue.current = null;
    execContext.current = {};
    if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  };

  const visibleFiles = useMemo(() => {
    return [...files.filter((file) => FilterOutSpecialDirs(file))];
  }, [files]);

  const commandList = useMemo(() => {
    return commands.map((cmd) => `${commandPrefix} ${cmd}`);
  }, [commandPrefix, commands]);

  // NEW: input handler that defers heavy search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    startTransition(() => {
      setDeferredSearch(value);
    });
  };

  const sortedList = useMemo(() => {
    setActiveIndex(-1);

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
      const results = fuzzysort.go(deferredSearch, options, { limit: 50 });
      return results.map((result) => ({
        element: renderItem ? (
          renderItem(result.target)
        ) : (
          <>
            {result.highlight((m, i) => (
              <b className="text-highlight-focus bg-highlight-focus" key={i}>
                {m}
              </b>
            ))}
          </>
        ),
        href: result.target,
      }));
    }

    // MARK: Spotlight state
    else if (!deferredSearch.trim()) {
      return visibleFiles.map((file) => ({
        element: <>{file}</>,
        href: file,
      }));
    } else {
      const results = fuzzysort.go(
        deferredSearch,
        deferredSearch.startsWith(commandPrefix) ? commandList : visibleFiles,
        { limit: 50 }
      );

      return results.map((result) => ({
        element: (
          <>
            {result.highlight((m, i) => (
              <b className="text-highlight-foreground" key={i}>
                {m}
              </b>
            ))}
          </>
        ),
        href: result.target,
      }));
    }
  }, [state, currentPrompt, commandList, commandPrefix, deferredSearch, visibleFiles]);

  //MARK: Handle Keys
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const menuItems = menuRef.current?.querySelectorAll('[role="menuitem"]');
    const itemsLength = menuItems?.length ?? 0;

    switch (e.key) {
      case "Enter":
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
          const selected = sortedList[activeIndex]?.href ?? 0;
          // if (activeIndex === -1) return;
          // const selected = sortedList[activeIndex]?.href;
          if (selected) {
            execContext.current[currentPrompt.name] = selected;
            setSearch("");
            setState("spotlight");
            setCurrentPrompt(null);
            return runNextStep();
          }
        }
        if (activeIndex === -1) {
          //if no item is active select first item
          setActiveIndex(0);
          return;
        }
        e.preventDefault();
        (menuItems?.[activeIndex] as HTMLElement)?.click();
        break;
      case "Tab":
        e.preventDefault();
        if (e.shiftKey) {
          setActiveIndex((prev) => (prev >= 0 ? prev - 1 : itemsLength - 1));
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
      case "Escape":
        e.preventDefault();
        handleClose();
        break;
      default:
        if (document.activeElement !== inputRef.current) {
          if (e.key === "p" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            e.stopPropagation();
            inputRef.current?.focus();
          } else if (e.key === "Backspace") {
            e.preventDefault();
            e.stopPropagation();
            setSearch((prev) => prev.slice(0, -1));
            inputRef.current?.focus();
          } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            e.stopPropagation();
            inputRef.current?.focus();
          } else if (e.key.length === 1) {
            e.preventDefault();
            e.stopPropagation();
            setSearch((prev) => prev + e.key);
            inputRef.current?.focus();
          }
        }
    }
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

  // MARK: Render
  return (
    <div
      ref={containerRef}
      className={clsx(
        "absolute left-0 right-0 top-4 z-50 m-auto flex w-[36rem] flex-col items-center justify-center",
        "translate-y-12",
        { "animate-in": open }
      )}
      onKeyDown={handleKeyDown}
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
          handleClose();
        }
      }}
    >
      <div className="flex h-12 w-full items-center justify-center rounded-lg border bg-background p-2 _text-sidebar-foreground/70 shadow-lg relative">
        <input
          ref={inputRef}
          value={search}
          onChange={handleInputChange}
          id="spotlight-search"
          type="text"
          autoComplete="off"
          placeholder={state === "prompt" || state === "select" ? promptPlaceholder : "Spotlight Search..."}
          className="w-full rounded-lg border-none bg-background p-2 text-md focus:outline-none"
          aria-controls="spotlight-menu"
          aria-haspopup="true"
          aria-activedescendant={activeIndex > -1 ? `spotlight-item-${activeIndex}` : undefined}
        />
        {/* {isPending && <div className="absolute right-3 text-xs text-muted-foreground">Searching...</div>} */}
      </div>
      {(state === "spotlight" || state === "select") && Boolean(sortedList.length) && (
        <ul
          ref={menuRef}
          id="spotlight-menu"
          role="menu"
          aria-labelledby="spotlight-search"
          className="mt-2 block max-h-96 w-full justify-center overflow-scroll rounded-lg bg-background drop-shadow-lg"
        >
          {sortedList.map((item, index) => {
            if (state === "spotlight" && item.href.startsWith(commandPrefix)) {
              return (
                <SpotlightSearchItemCmd
                  key={item.href}
                  id={`spotlight-item-${index}`}
                  cmd={item.href}
                  title={item.element}
                  isActive={index === activeIndex}
                  onSelect={() => handleCommandSelect(item.href.replace(commandPrefix, "").trim())}
                />
              );
            }
            return (
              <SpotlightSearchItemLink
                key={item.href}
                id={`spotlight-item-${index}`}
                isActive={index === activeIndex}
                onSelect={(e: any) => {
                  return state === "select"
                    ? (() => {
                        e.preventDefault();
                        e.stopPropagation();
                        execContext.current[currentPrompt!.name] = item.href;
                        setSearch("");
                        setState("spotlight");
                        setCurrentPrompt(null);
                        void runNextStep();
                      })()
                    : handleClose();
                }}
                href={state === "select" ? (item.href as AbsPath) : joinPath(basePath, item.href)}
                title={item.element}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}

//
// ---- Types ----
//
export type CmdMapMember = CmdPrompt | CmdExec | CmdSelect;

export type CmdMap = {
  [key: string]: CmdMapMember[];
};

export type CmdPrompt = {
  name: string;
  description: string;
  type: "prompt";
};

export type CmdExec = {
  exec: (context: Record<string, unknown>, abort: () => void) => (void | boolean) | Promise<void | boolean>;
  type: "exec";
};

export type CmdSelect = {
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

export const NewCmdSelect = (
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
export function isCmdPrompt(cmd: CmdMapMember): cmd is CmdPrompt {
  return cmd.type === "prompt";
}
export function isCmdExec(cmd: CmdMapMember): cmd is CmdExec {
  return cmd.type === "exec";
}
export function isCmdSelect(cmd: CmdMapMember): cmd is CmdSelect {
  return cmd.type === "select";
}

//
// ---- Theme Preview Component ----
//
const ThemePreview = ({ themeName, currentTheme }: { themeName: string; currentTheme: string }) => {
  const palette = getThemePreviewPalette(themeRegistry as unknown as ThemeRegistry, themeName);

  if (!palette) {
    return <span>{themeName}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      {currentTheme === themeName && (
        <span className="text-2xs px-1 py-0.5 font-mono bg-success text-success-foreground rounded">Current</span>
      )}
      {/* Light mode preview */}
      <div className="flex gap-1 p-1 rounded" style={{ backgroundColor: palette.lightBg }}>
        {palette.light.map((color, index) => (
          <div
            key={`light-${index}`}
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
            title={`Light mode color ${index + 1}`}
          />
        ))}
      </div>

      {/* Dark mode preview */}
      <div className="flex gap-1 p-1 rounded" style={{ backgroundColor: palette.darkBg }}>
        {palette.dark.map((color, index) => (
          <div
            key={`dark-${index}`}
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
            title={`Dark mode color ${index + 1}`}
          />
        ))}
      </div>

      <span>{themeName}</span>
    </div>
  );
};

//
// ---- Hook ----
//
export function useSpotlightCommandPalette({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const { newFile, newDir, renameDirOrFile, trashFile } = useWorkspaceFileMgmt(currentWorkspace);
  const { repo, playbook } = currentWorkspace;
  const previewURL = useWorkspacePathPreviewURL();
  const { focused } = useFileTreeMenuCtx();
  const { path: currentPath } = useWorkspaceRoute();
  const { isMarkdown } = useCurrentFilepath();
  const { themeName: currentTheme } = useTheme();
  const navigate = useNavigate();
  const { mode, setTheme, toggleMode, availableThemes } = useTheme();

  const cmdMap = useMemo(
    () =>
      ({
        // MARK: Editor Commands

        "Open External Preview": [
          NewCmdExec(() => {
            window.open(previewURL!, "_blank", "noopener,noreferrer");
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
        "New Style CSS": [
          NewCmdExec(async () => {
            const path = await newFile(absPath("styles.css"));
            void navigate({
              to: currentWorkspace.resolveFileUrl(path),
            });
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

        "New Dir": [
          NewCmdPrompt("dir_name", "Enter new directory name"),
          NewCmdExec(async (context) => {
            const name = context.dir_name as string;
            if (!name) {
              console.warn("No directory name provided");
              return;
            }
            const dir = currentWorkspace.nodeFromPath(currentPath)?.closestDirPath() ?? ("/" as AbsPath);
            const dirName = joinPath(dir, prefix(basename(name || "newdir")));
            const path = await newDir(absPath(strictPrefix(dirName)));
            console.log("New directory created at:", path);
          }),
        ],

        "New File (Markdown)": [
          NewCmdPrompt("markdown_file_name", "Enter markdown file name"),
          NewCmdExec(async (context) => {
            const name = context.markdown_file_name as string;
            if (!name) {
              console.warn("No file name provided for new markdown file");
              return;
            }
            const fileName = absPath(strictPrefix(name) + ".md");
            const dir = currentWorkspace.nodeFromPath(focused || currentPath)?.closestDirPath() ?? ("/" as AbsPath);
            const path = await newFile(joinPath(dir, fileName));
            void navigate({
              to: currentWorkspace.resolveFileUrl(path),
            });
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
          }),
        ],
        "Git Merge Commit": [
          NewCmdExec(async () => {
            if (!repo.getInfo()?.initialized) {
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
            if (!repo.getInfo()?.initialized) {
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
            toggleMode();
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
      playbook,
      previewURL,
      renameDirOrFile,
      repo,
      setTheme,
      toggleMode,
      trashFile,
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
      cmds.add("Open External Preview");
    }
    if (!isMarkdown) {
      cmds.add("Rich Text View");
      cmds.add("Source View");
    }
    if (gitRepoInfo.initialized) {
      cmds.add("Git Initialize Repo");
    }
    if (!gitRepoInfo.initialized || !gitRepoInfo?.hasChanges || gitRepoInfo.unmergedFiles.length) {
      // cmds.add("Git Commit");
    }
    if (!gitRepoInfo.unmergedFiles.length || !gitRepoInfo.initialized) {
      cmds.add("Git Merge Commit");
    }
    return cmds;
  }, [
    currentWorkspace,
    currentPath,
    isMarkdown,
    gitRepoInfo.initialized,
    gitRepoInfo?.hasChanges,
    gitRepoInfo.unmergedFiles.length,
  ]);

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
