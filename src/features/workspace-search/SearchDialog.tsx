"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { SearchResult } from "@/features/search/SearchResults";
import { DiskSearchResultData } from "@/features/search/useSearchWorkspace";
import { absPath, joinPath, relPath } from "@/lib/paths2";
import { WorkspaceSearchResponse } from "@/lib/ServiceWorker/handleWorkspaceSearch";
import { ChevronRight, FileTextIcon, Loader, Search, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

const MAX_MATCHES_SHOWN = 5;
const SEARCH_DEBOUNCE_MS = 250; // 250ms debounce delay

export function WorkspaceSearchDialog({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dismissedFiles, setDismissedFiles] = useState<Set<string>>(new Set());
  const { currentWorkspace } = useWorkspaceContext();

  // --- Refactored State Management ---
  const [isSearching, setIsSearching] = useState(false);
  const [queryResults, setQueryResults] = useState<DiskSearchResultData[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetSearchState = useCallback(() => {
    setSearchTerm("");
    setDismissedFiles(new Set());
    setQueryResults(null);
    setIsSearching(false);
    setError(null);
  }, []);

  // --- Refactored Search Logic with useEffect ---
  useEffect(() => {
    if (!searchTerm.trim()) {
      resetSearchState();
      return;
    }

    const controller = new AbortController();
    const searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      setQueryResults(null);
      setError(null);

      const url = new URL(`/workspace-search/${currentWorkspace.name}`, window.location.origin);
      url.searchParams.set("searchTerm", searchTerm);

      try {
        const res = await fetch(url.toString(), { signal: controller.signal });

        if (res.status === 204) {
          return;
        }
        if (!res.ok) {
          throw new Error(`Search failed: ${res.statusText}`);
        }

        const { results } = (await res.json()) as WorkspaceSearchResponse;
        setQueryResults(results);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        console.error("Search error:", err);
        setError("Search failed. Please try again.");
      } finally {
        setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(searchTimeout);
      controller.abort();
    };
  }, [searchTerm, currentWorkspace.name, resetSearchState]);

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        resetSearchState();
      }
      setOpen(open);
    },
    [resetSearchState]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        e.stopImmediatePropagation();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  const dismissFile = (file: string) => {
    setDismissedFiles((prev) => new Set(prev).add(file));
  };

  const filteredResults = useMemo(
    () => (!queryResults ? null : queryResults.filter((result) => !dismissedFiles.has(result.meta.filePath))),
    [queryResults, dismissedFiles]
  );

  const renderSearchResults = useMemo(() => {
    if (isSearching) {
      return (
        <div className="flex justify-center items-center text-muted-foreground py-8 text-sm font-mono w-full h-full">
          <div className="animate-spin">
            <Loader className="w-6 h-6" />
          </div>
        </div>
      );
    }

    if (error) {
      return <div className="text-center text-destructive py-8 text-sm font-mono">{error}</div>;
    }

    if (queryResults !== null) {
      return <SearchResults results={filteredResults} dismissFile={dismissFile} />;
    }

    return null;
  }, [error, filteredResults, isSearching, queryResults]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
        <Collapsible className="group/collapsible">
          <form onSubmit={handleSubmit} className="flex">
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
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
          {/* --- THIS SECTION IS NOW RESTORED --- */}
          <CollapsibleContent>
            <div className="flex items-center gap-2 mt-4">
              <Checkbox id="all_workspaces_option" className="scale-75" />
              <Label
                className="text-2xs font-mono text-primary flex items-center gap-1"
                htmlFor="all_workspaces_option"
              >
                <span>all workspaces</span>
              </Label>
              <RadioGroup className="flex items-center gap-2 ml-4" defaultValue="markdown_option">
                <RadioGroupItem id="markdown_option" value="markdown_option" className="scale-75" />
                <Label className="text-2xs font-mono text-primary flex items-center gap-1" htmlFor="markdown_option">
                  <span>markdown</span>
                </Label>
                <RadioGroupItem id="rich_text_option" value="rich_text_option" className="scale-75" />
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
// --- Updated SearchResults Component ---
function SearchResults({
  results,
  dismissFile,
}: {
  results: DiskSearchResultData[] | null;
  dismissFile: (path: string) => void;
}) {
  // Note: The pending/spinner state is now handled by the parent.
  if (!results) {
    // This case should ideally not be hit if parent logic is correct,
    // but it's safe to keep.
    return null;
  }
  if (results.length === 0) {
    return <div className="text-center text-muted-foreground py-8 text-sm font-mono">No results found</div>;
  }

  return (
    <ul className="block">
      {results.map((result) => (
        <li className="block" key={result.meta.filePath}>
          <SearchFile searchResult={result} closeFile={() => dismissFile(result.meta.filePath)} />
        </li>
      ))}
    </ul>
  );
}

function SearchFile({ searchResult, closeFile }: { searchResult: DiskSearchResultData; closeFile: () => void }) {
  const matches = useMemo(() => searchResult.matches.map((sr) => SearchResult.FromJSON(sr)), [searchResult.matches]);
  const [expanded, setExpanded] = useState(() => !(matches.length > MAX_MATCHES_SHOWN));
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const visibleMatches = useMemo(() => (expanded ? matches : matches.slice(0, MAX_MATCHES_SHOWN)), [expanded, matches]);

  const showExpandButton = matches.length > MAX_MATCHES_SHOWN;

  return (
    <div className="mb-4 rounded-b-lg">
      <Link
        title={searchResult.meta.filePath}
        href={searchResult.meta.filePath}
        className="w-full flex items-center border rounded-t text-xs font-mono h-8 sticky top-0 z-10 bg-accent hover:bg-primary-foreground"
      >
        <div className="ml-1 text-ring">
          <FileTextIcon size={12} />
        </div>
        <div className="flex-1 min-w-0 truncate px-2 py-2">{relPath(searchResult.meta.filePath)}</div>
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
              href={`${joinPath(WorkspaceDAO.rootRoute, absPath(searchResult.meta.filePath))}`}
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
            onBlur={() => {
              if (expanded) setExpanded(false);
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

function SearchLine({ match, href }: { match: SearchResult; href: string }) {
  return (
    // 1. Use flexbox to align the line number and the text content
    <Link href={href}>
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
          <span className="bg-highlight">{match.middleText}</span>
          {match.endText}
        </div>
      </div>
    </Link>
  );
}
