"use client";

import { rangesToSearchParams } from "@/components/Editor/CodeMirrorSelectURLRangePlugin";
import { SelectWorkspaceComplete } from "@/components/SelectWorkspaceComplete";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { WorkspaceIcon } from "@/components/WorkspaceIcon";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { WorkspaceSearchItem } from "@/Db/WorkspaceScannable";
import { SearchResult } from "@/features/search/SearchResults";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { ALL_WS_KEY } from "@/features/workspace-search/AllWSKey";
import { useWorkspaceSearchResults } from "@/features/workspace-search/useWorkspaceSearchResults";
import useLocalStorage2 from "@/hooks/useLocalStorage2";
import { AbsPath, absPath, joinPath } from "@/lib/paths2";
import { ChevronRight, FileTextIcon, Loader, Search, SearchXIcon, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const MAX_MATCHES_SHOWN = 5;

export function WorkspaceSearchDialog({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { currentWorkspace, workspaces } = useWorkspaceContext();
  const [isOptionsOpen, setOptionsOpen] = useSingleItemExpander("SearchDialog/options/expand", true);

  const { storedValue: optionsValue, setValue: setOptionsValue } = useLocalStorage2(
    "SearchDialog/options/values",
    () =>
      ({ workspace: ALL_WS_KEY, type: "markdown" } as {
        workspace: string;
        type: "markdown" | "rich";
      })
  );

  //keeps saved workspace in sync with the current workspaces
  useEffect(() => {
    if (optionsValue.workspace !== ALL_WS_KEY && !workspaces.some((ws) => ws.name === optionsValue.workspace)) {
      setOptionsValue((prev) => ({ ...prev, workspace: ALL_WS_KEY }));
    }
  }, [optionsValue.workspace, setOptionsValue, workspaces]);

  const { isSearching, error, tearDown, hasResults, hideResult, resetSearch, workspaceResults, submit } =
    useWorkspaceSearchResults();
  const { workspace } = optionsValue;
  const currWorkspaceName = currentWorkspace.name;
  const resetComponentState = () => {
    setSearchTerm("");
    resetSearch();
  };

  const handleInputChange = (searchTerm: string) => {
    setSearchTerm(searchTerm);
    submit({ searchTerm, workspaceName: workspace });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleOpenChange = (open: boolean) => {
    if (open) {
      // When the dialog opens, reset its state.
      resetComponentState();
    } else {
      tearDown();
    }
    setOpen(open);
  };

  // --- Keyboard shortcut effect (no changes) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        e.stopPropagation();
        handleOpenChange(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleOpenChange]);

  const renderSearchResults = useMemo(() => {
    if (error) {
      return <div className="text-center text-destructive py-8 text-sm font-mono">{error}</div>;
    }
    if (hasResults) {
      return workspaceResults.map(([workspaceName, items]) => (
        <SearchResults
          key={workspaceName + "@" + items?.length}
          workspaceName={workspaceName}
          workspaceId={items[0]!.meta.workspaceId ?? ""}
          results={items}
          dismissFile={(path) => hideResult(workspaceName, path)}
          onNavigate={() => handleOpenChange(false)}
        />
      ));
    }
    if (isSearching) {
      return (
        <div className="flex justify-center items-center text-muted-foreground py-8 text-sm font-mono w-full h-full">
          <div className="animate-spin">
            <Loader className="w-6 h-6" />
          </div>
        </div>
      );
    }
    if (searchTerm)
      return (
        <div className="w-full  justify-center items-center flex font-mono h-12 gap-2">
          <SearchXIcon />
          {"no results"}
        </div>
      );
    return null;
  }, [error, handleOpenChange, hasResults, hideResult, isSearching, searchTerm, workspaceResults]);

  const handleWorkspaceChange = (workspaceId: string) => {
    setOptionsValue((prev) => ({ ...prev, workspace: workspaceId }));
    resetSearch();
    submit({ searchTerm, workspaceName: workspaceId });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {/* ... The rest of your JSX remains the same ... */}
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="sm:max-w-[720px] max-h-[80svh] flex flex-col top-[15vh] translate-y-0"
        onEscapeKeyDown={(event) => {
          if (document.activeElement?.hasAttribute("data-search-file-expand")) {
            event.preventDefault();
          }
        }}
      >
        <DialogTitle className="font-mono font-thin text-xs flex items-center gap-2 -mt-4 -ml-4 mb-2">
          <Search size={16} /> search
        </DialogTitle>
        <Collapsible className="group/collapsible" open={isOptionsOpen} onOpenChange={(state) => setOptionsOpen(state)}>
          <div className="flex">
            <CollapsibleTrigger className="text-xs flex items-center -ml-3 mr-1 outline-none" asChild>
              <button className="ouline-none" type="button">
                <ChevronRight
                  size={14}
                  className={
                    "outline-none w-4 transition-transform duration-100 group-data-[state=open]/collapsible:rotate-90 group-data-[state=closed]/collapsible:rotate-0 -ml-2"
                  }
                />
              </button>
            </CollapsibleTrigger>
            <Input
              autoFocus
              className="md:text-xs text-xs outline-ring border bg-sidebar font-mono"
              placeholder="search workspace..."
              value={searchTerm}
              onChange={(e) => handleInputChange(e.target.value)}
            />
          </div>
          <CollapsibleContent>
            <div className="flex items-center gap-2 mt-4">
              <SelectWorkspaceComplete
                initialValue={optionsValue.workspace}
                defaultValue={ALL_WS_KEY}
                workspaces={workspaces}
                onChange={handleWorkspaceChange}
              />
              <RadioGroup
                className="_flex items-center gap-2 ml-4 hidden TODO-SOMEDAY"
                defaultValue={optionsValue.type}
                onValueChange={(type: "markdown" | "rich") => {
                  setOptionsValue((prev) => ({ ...prev, type }));
                  resetSearch();
                  submit({ searchTerm, workspaceName: currWorkspaceName });
                }}
              >
                <RadioGroupItem id="markdown_option" value="markdown" className="scale-75" />
                <Label className="text-2xs font-mono text-primary flex items-center gap-1" htmlFor="markdown_option">
                  <span>markdown</span>
                </Label>
                <RadioGroupItem id="rich_text_option" value="rich" className="scale-75" />
                <Label className="text-2xs font-mono text-primary flex items-center gap-1" htmlFor="rich_text_option">
                  <span>rich text</span>
                </Label>
              </RadioGroup>
            </div>
          </CollapsibleContent>
        </Collapsible>
        <div className="h-full overflow-y-scroll no-scrollbar mt-2">{renderSearchResults}</div>
      </DialogContent>
    </Dialog>
  );
}
function SearchResults({
  results,
  dismissFile,
  onNavigate,
  workspaceName,
  workspaceId,
}: {
  results: WorkspaceSearchItem[];
  dismissFile: (path: AbsPath) => void;
  onNavigate?: () => void;
  workspaceId: string;
  workspaceName: string;
}) {
  if (results.length === 0) {
    return <div className="text-center text-muted-foreground py-8 text-sm font-mono">No results found</div>;
  }
  return (
    <div>
      <div className="text-md bold underline mb-1 w-full justify-start items-center flex">
        <div className="flex items-center justify-start gap-2 mb-1">
          <WorkspaceIcon
            variant="round"
            size={3}
            scale={4}
            input={workspaceId}
            className="border border-primary-foreground "
          />
          <Link
            onClick={onNavigate}
            href={joinPath(WorkspaceDAO.rootRoute, workspaceName)}
            className="font-mono uppercase text-xs "
          >
            {workspaceName}
          </Link>
        </div>
      </div>
      <ul className="block">
        {results.map((result) => (
          <li className="block" key={result.meta.filePath}>
            <SearchFile
              searchResult={result}
              closeFile={() => dismissFile(result.meta.filePath)}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SearchFile({
  searchResult,
  closeFile,
  onNavigate,
}: {
  searchResult: WorkspaceSearchItem;
  closeFile: () => void;
  onNavigate?: () => void;
}) {
  const matches = useMemo(() => searchResult.matches.map((sr) => SearchResult.FromJSON(sr)), [searchResult.matches]);
  const [expanded, setExpanded] = useState(() => !(matches.length > MAX_MATCHES_SHOWN));
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const visibleMatches = useMemo(() => (expanded ? matches : matches.slice(0, MAX_MATCHES_SHOWN)), [expanded, matches]);

  const showExpandButton = matches.length > MAX_MATCHES_SHOWN;
  const { workspaceName, filePath } = searchResult.meta;
  const href = joinPath(WorkspaceDAO.rootRoute, workspaceName, filePath);

  return (
    <div className="mb-4 rounded-b-lg">
      <Link
        onClick={onNavigate}
        title={`${workspaceName}/${filePath}`}
        href={href}
        className="w-full flex items-center border rounded-t text-xs font-mono h-8 sticky top-0 z-10 bg-accent hover:bg-primary-foreground"
      >
        <div className="ml-1 flex items-center justify-center h-full gap-2 ">
          <FileTextIcon size={12} className="text-ring h-4" />
        </div>
        <div className="flex-1 min-w-0 truncate px-2 py-2">{filePath}</div>
        <Button
          variant="ghost"
          className="flex-shrink-0 h-5 w-5 p-0 mr-1 ml-2 scale-150 rounded-none"
          onClick={(e) => {
            closeFile();
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <X size={14} strokeWidth={1} />
        </Button>
      </Link>
      <div className="mt-1">
        <div>
          {visibleMatches.map((match, i) => (
            <SearchLine
              href={`${joinPath(
                WorkspaceDAO.rootRoute,
                absPath(searchResult.meta.workspaceName),
                absPath(searchResult.meta.filePath)
              )}`}
              onClick={onNavigate}
              key={`${match.lineNumber}-${i}`}
              match={match}
            />
          ))}
        </div>
        {showExpandButton && (
          <Button
            variant="ghost"
            size="sm"
            tabIndex={0}
            data-search-file-expand
            className="!rounded-b-lg w-full flex justify-center h-4 items-center bg-primary/5 mt-1 rounded-none"
            onClick={() => setExpanded(!expanded)}
            onMouseUp={() => buttonRef.current?.focus()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Escape") {
                setExpanded(false);
                buttonRef.current?.blur();
              }
            }}
            onBlur={(e) => {
              const target = e.relatedTarget as Node | null;
              if (expanded && !(target as HTMLElement)?.closest("a")) {
                setExpanded(false);
              }
            }}
            ref={buttonRef}
          >
            <span className="p-0.5 text-primary/80 text-3xs font-mono">
              {expanded ? "collapse" : `expand ${matches.length - MAX_MATCHES_SHOWN} more`}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}

function SearchLine({ match, href, onClick }: { match: SearchResult; href: string; onClick?: () => void }) {
  const sp = rangesToSearchParams([[match.start, match.end, match.chsum]], {
    viewMode: "source",
  });
  return (
    // 1. Use flexbox to align the line number and the text content
    <a href={href + "?" + sp} onClick={onClick}>
      <div className="border-b-4 last-of-type:border-none border-background flex items-start p-1 py-1 bg-primary-foreground font-mono text-xs group hover:bg-ring/80 cursor-pointer hover:text-primary-foreground">
        {/* 2. Create a container for the line number and badge */}
        <div className="relative min-w-8 text-right font-bold mr-2">
          {/* 3. Conditionally render the linesSpanned badge */}
          {match.linesSpanned > 0 && (
            <div className="group-hover:text-white group-hover:bg-ring bg-primary-foreground w-8 left-4 absolute -top-2.5 -right-2 flex items-center justify-center rounded-full text-ring scale-75 text-[10px] font-bold">
              +{match.linesSpanned}
            </div>
          )}
          {/* 4. The line number is now a real span */}
          <span>{match.lineNumber}:</span>
        </div>

        {/* 5. The text content is in its own div to handle truncation */}
        <div className="truncate whitespace-nowrap ml-2">
          {match.startText}
          <span className="bg-search-highlight-bg text-search-highlight-fg">{match.middleText}</span>
          {match.endText}
        </div>
      </div>
    </a>
  );
}
