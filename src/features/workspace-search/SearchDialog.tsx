import { rangesToSearchParams } from "@/components/Editor/CodeMirrorSelectURLRangePlugin";
import { SelectWorkspaceComplete } from "@/components/SelectWorkspaceComplete";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { WorkspaceIcon } from "@/components/WorkspaceIcon";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { WorkspaceSearchItem } from "@/Db/WorkspaceScannable";
import { SearchResult } from "@/features/search/SearchResults";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { ALL_WS_KEY } from "@/features/workspace-search/AllWSKey";
import { useWorkspaceSearchResults } from "@/features/workspace-search/useWorkspaceSearchResults";
import useLocalStorage2 from "@/hooks/useLocalStorage2";
import { AbsPath, absPath, joinPath } from "@/lib/paths2";
import { Link } from "@tanstack/react-router";
import { ChevronRight, FileTextIcon, Loader, Search, SearchXIcon, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const MAX_MATCHES_SHOWN = 5;

export function WorkspaceSearchDialog({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { currentWorkspace, workspaces } = useWorkspaceContext();
  const [isOptionsOpen, setOptionsOpen] = useSingleItemExpander("SearchDialog/options/expand", true);

  const { storedValue: optionsValue, setStoredValue: setOptionsValue } = useLocalStorage2(
    "SearchDialog/options/values",
    () =>
      ({ workspace: ALL_WS_KEY, type: "markdown", regexp: true }) as {
        workspace: string;
        type: "markdown" | "rich";
        regexp: boolean;
      }
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
    submit({ searchTerm, workspaceName: workspace, regexp: optionsValue.regexp });
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
      return <div className="py-8 text-center text-sm font-mono text-destructive">{error}</div>;
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
        <div className="flex h-full w-full items-center justify-center py-8 font-mono text-sm text-muted-foreground">
          <div className="animate-spin">
            <Loader className="h-6 w-6" />
          </div>
        </div>
      );
    }
    if (searchTerm)
      return (
        <div className="flex h-12 w-full items-center justify-center gap-2 font-mono">
          <SearchXIcon />
          {"no results"}
        </div>
      );
    return null;
  }, [error, handleOpenChange, hasResults, hideResult, isSearching, searchTerm, workspaceResults]);

  const handleWorkspaceChange = (workspaceId: string) => {
    setOptionsValue((prev) => ({ ...prev, workspace: workspaceId }));
    resetSearch();
    submit({ searchTerm, workspaceName: workspaceId, regexp: optionsValue.regexp });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {/* ... The rest of your JSX remains the same ... */}
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="top-[15vh] flex max-h-[80svh] translate-y-0 flex-col sm:max-w-[45rem]"
        onEscapeKeyDown={(event) => {
          if (document.activeElement?.hasAttribute("data-search-file-expand")) {
            event.preventDefault();
          }
        }}
      >
        <DialogTitle className="-ml-4 -mt-4 mb-2 flex items-center gap-2 font-mono text-xs font-thin">
          <Search size={16} /> search
        </DialogTitle>
        <Collapsible className="group/collapsible" open={isOptionsOpen} onOpenChange={(state) => setOptionsOpen(state)}>
          <div className="flex">
            <CollapsibleTrigger className="-ml-3 mr-1 flex items-center text-xs outline-none" asChild>
              <button className="ouline-none" type="button">
                <ChevronRight
                  size={14}
                  className={
                    "transition-transform duration-100 group-data-[state=open]/collapsible:rotate-90 group-data-[state=closed]/collapsible:rotate-0 -ml-2 w-4 outline-none"
                  }
                />
              </button>
            </CollapsibleTrigger>
            <Input
              autoFocus
              className="border bg-muted font-mono text-xs outline-ring md:text-xs"
              placeholder="search workspace..."
              value={searchTerm}
              onChange={(e) => handleInputChange(e.target.value)}
            />
          </div>
          <CollapsibleContent>
            <div className="mt-4 flex items-center gap-2">
              <SelectWorkspaceComplete
                initialValue={optionsValue.workspace}
                defaultValue={ALL_WS_KEY}
                workspaces={workspaces}
                onChange={handleWorkspaceChange}
              />
              <div className="flex items-center gap-2 ml-4">
                <Checkbox
                  id="regexp_option"
                  checked={optionsValue.regexp}
                  onCheckedChange={(checked) => {
                    const newRegexpValue = checked === true;
                    setOptionsValue((prev) => ({ ...prev, regexp: newRegexpValue }));
                    resetSearch();
                    submit({ searchTerm, workspaceName: workspace, regexp: newRegexpValue });
                  }}
                />
                <Label className="flex items-center gap-1 font-mono text-2xs text-primary" htmlFor="regexp_option">
                  <span>regex</span>
                </Label>
              </div>
              <RadioGroup
                className="_flex ml-4 hidden items-center gap-2 TODO-SOMEDAY"
                defaultValue={optionsValue.type}
                onValueChange={(type: "markdown" | "rich") => {
                  setOptionsValue((prev) => ({ ...prev, type }));
                  resetSearch();
                  submit({ searchTerm, workspaceName: currWorkspaceName, regexp: optionsValue.regexp });
                }}
              >
                <RadioGroupItem id="markdown_option" value="markdown" className="scale-75" />
                <Label className="flex items-center gap-1 font-mono text-2xs text-primary" htmlFor="markdown_option">
                  <span>markdown</span>
                </Label>
                <RadioGroupItem id="rich_text_option" value="rich" className="scale-75" />
                <Label className="flex items-center gap-1 font-mono text-2xs text-primary" htmlFor="rich_text_option">
                  <span>rich text</span>
                </Label>
              </RadioGroup>
            </div>
          </CollapsibleContent>
        </Collapsible>
        <div className="no-scrollbar mt-2 h-full overflow-y-scroll">{renderSearchResults}</div>
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
    return <div className="py-8 text-center font-mono text-sm text-muted-foreground">No results found</div>;
  }
  return (
    <div>
      <div className="mb-1 flex w-full items-center justify-start text-lg font-bold underline">
        <div className="mb-1 flex items-center justify-start gap-2">
          <WorkspaceIcon
            variant="round"
            size={3}
            scale={4}
            input={workspaceId}
            className="border border-primary-foreground "
          />
          <Link
            onClick={onNavigate}
            to={joinPath(WorkspaceDAO.rootRoute, workspaceName).toString()}
            className="font-mono text-xs uppercase "
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
        to={href.toString()}
        className="sticky top-0 z-10 flex h-8 w-full items-center rounded-t border-sidebar-border bg-sidebar font-mono text-xs text-sidebar-foreground hover:bg-sidebar-primary"
      >
        <div className="ml-1 flex h-full items-center justify-center gap-2 ">
          <FileTextIcon size={12} className="h-4 text-sidebar-ring" />
        </div>
        <div className="min-w-0 flex-1 truncate px-2 py-2">{filePath}</div>
        <Button
          variant="ghost"
          className="mr-1 ml-2 h-5 w-5 flex-shrink-0 scale-150 rounded-none p-0"
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
            className="!rounded-b-lg mt-1 flex h-4 w-full items-center justify-center rounded-none bg-primary/5"
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
            <span className="p-0.5 font-mono text-3xs text-primary/80">
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
    <a href={href + "#" + sp} onClick={onClick}>
      <div className="group flex cursor-pointer items-start border-b-4 border-background bg-sidebar-foreground p-1 py-1 font-mono text-xs text-sidebar last-of-type:border-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
        <div className="relative mr-2 min-w-8 text-right font-bold">
          {match.linesSpanned > 0 && (
            <div className="absolute -top-2.5 -right-2 flex h-auto w-8 items-center justify-center rounded-full bg-sidebar-foreground text-[0.625rem] font-bold text-sidebar-ring scale-75 group-hover:bg-sidebar-ring group-hover:text-sidebar-primary-foreground">
              +{match.linesSpanned}
            </div>
          )}
          <span>{match.lineNumber}:</span>
        </div>

        <div className="ml-2 truncate whitespace-nowrap">
          {match.startText}
          <span className="rounded-sm bg-sidebar-primary px-0.5 text-sidebar-primary-foreground">
            {match.middleText}
          </span>
          {match.endText}
        </div>
      </div>
    </a>
  );
}
