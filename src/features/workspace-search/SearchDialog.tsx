"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { SearchResult } from "@/features/search/SearchResults";
import { DiskSearchResultData, useSearchWorkspace } from "@/features/search/useSearchWorkspace";
import { relPath } from "@/lib/paths2";
import { WorkspaceSearchResponse } from "@/lib/ServiceWorker/handleWorkspaceSearch";
import { ChevronRight, FileTextIcon, Loader, Search, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

const MAX_MATCHES_SHOWN = 5;

export function WorkspaceSearchDialog({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dismissedFiles, setDismissedFiles] = useState<Set<string>>(new Set());

  const { currentWorkspace } = useWorkspaceContext();

  const { results, submit: submitSearch, reset: resetSearch } = useSearchWorkspace(currentWorkspace);

  const [queryResults, setQueryResults] = useState<DiskSearchResultData[] | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false);
  const resetDoSearch = useCallback(() => {
    setQueryResults([]);
  }, []);
  const doSearch = useCallback(
    async function (st: string) {
      setPending(true);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      if (!st) {
        setPending(false);
        return resetDoSearch();
      }

      const url = new URL(`/workspace-search/${currentWorkspace.name}`, window.location.origin);
      url.searchParams.set("searchTerm", st);

      try {
        const res = await fetch(url.toString(), {
          signal: abortControllerRef.current?.signal,
        });
        if (!res.ok) {
          throw new Error(`Search failed with status ${res.status}`);
        }
        const { results } = (await res.json()) as WorkspaceSearchResponse;
        setQueryResults(results);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        if (err.name === "AbortError") {
          // Aborted fetch, do nothing (this is expected)
          return;
        }
        // Handle other errors (optional: show error to user, etc.)
        console.error("Search error:", err);
      } finally {
        setPending(false);
      }
    },
    [currentWorkspace.name, resetDoSearch]
  );
  const reset = useCallback(() => {
    setSearchTerm("");
    setDismissedFiles(new Set());
    resetSearch();
  }, [resetSearch]);

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        reset();
      }
      setOpen(open);
    },
    [reset]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        onOpenChange(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOpenChange]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // void submitSearch(searchTerm);
      void doSearch(searchTerm);
    }
  };

  const updateSearchTerm = useCallback(
    (term: string) => {
      if (term.trim() === "") {
        reset();
      } else {
        setSearchTerm(term);
      }
    },
    [reset]
  );

  const dismissFile = (file: string) => {
    setDismissedFiles((prev) => new Set(prev).add(file));
  };

  // const filteredResults = useMemo(
  //   () => results.filter((result) => !dismissedFiles.has(result.meta.path)),
  //   [results, dismissedFiles]
  // );
  const filteredResults = useMemo(
    () => (!queryResults ? null : queryResults.filter((result) => !dismissedFiles.has(result.meta.path))),
    [queryResults, dismissedFiles]
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        // UPDATED: Set max-height, a fixed top position, and reset the vertical transform.
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
              // onChange={(e) => updateSearchTerm(e.target.value)}
              onChange={(e) => {
                // void submitSearch(searchTerm);
                void doSearch(e.target.value);
                updateSearchTerm(e.target.value);
              }}
            />
          </form>
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
        <div className="h-full overflow-y-scroll no-scrollbar mt-2">
          {searchTerm && <SearchResults isPending={pending} results={filteredResults} dismissFile={dismissFile} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SearchResults({
  results,
  dismissFile,
  isPending,
}: {
  results: DiskSearchResultData[] | null;
  dismissFile: (path: string) => void;
  isPending: boolean;
}) {
  if (isPending) {
    return (
      <div className="flex justify-center items-center text-muted-foreground py-8 text-sm font-mono w-full h-full">
        <div className="animate-spin">
          <Loader className="w-6 h-6" />
        </div>
      </div>
    );
  }
  if (!results) return;
  if (results.length === 0) {
    return <div className="text-center text-muted-foreground py-8 text-sm font-mono">No results found</div>;
  }

  return (
    <ul className="block">
      {results.map((result) => (
        <li className="block" key={result.meta.path}>
          <SearchFile searchResult={result} closeFile={() => dismissFile(result.meta.path)} />
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
        title={searchResult.meta.path}
        href={searchResult.meta.path}
        className="w-full flex items-center border rounded-t text-xs font-mono h-8 sticky top-0 z-10 bg-accent hover:bg-primary-foreground"
      >
        <div className="ml-1 text-ring">
          <FileTextIcon size={12} />
        </div>
        <div className="flex-1 min-w-0 truncate px-2 py-2">{relPath(searchResult.meta.path)}</div>
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
            <SearchLine key={`${match.lineNumber}-${i}`} match={match} />
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

function SearchLine({ match }: { match: SearchResult }) {
  return (
    // 1. Use flexbox to align the line number and the text content
    <div className="border-b-4 last-of-type:border-none border-background flex items-start p-1 py-1 bg-primary-foreground font-mono text-xs hover:bg-ring/80 cursor-pointer hover:text-primary-foreground">
      {/* 2. Create a container for the line number and badge */}
      <div className="relative min-w-8 text-right font-bold mr-2">
        {/* 3. Conditionally render the linesSpanned badge */}
        {match.linesSpanned > 0 && (
          <div className="absolute -top-2.5 -right-2 z-10 w-4 flex items-center justify-center rounded-full text-ring scale-75 text-[10px] font-bold">
            +{match.linesSpanned}
          </div>
        )}
        {/* 4. The line number is now a real span */}
        <span>{match.lineNumber}:</span>
      </div>

      {/* 5. The text content is in its own div to handle truncation */}
      <div className="truncate whitespace-nowrap">
        {match.startText}
        <span className="bg-highlight">{match.middleText}</span>
        {match.endText}
      </div>
    </div>
  );
}
