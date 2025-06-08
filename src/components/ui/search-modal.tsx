"use client";

import Identicon from "@/components/Identicon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { TextSearchResultType } from "@/Db/SearchScan";
import { useSearchWorkspace } from "@/workers/SearchWorker/useSearchWorkspace";
import { ChevronDown, ChevronRight, FileText, Globe, Search, X } from "lucide-react";
import { useState } from "react";

export function SearchModal({ children }: { children: React.ReactNode }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
  const [dismissedFiles, setDismissedFiles] = useState<Set<string>>(new Set());
  const [selectedWorkspace, setSelectedWorkspace] = useState("all");
  const toggleFileCollapse = (file: string) => {
    const newCollapsed = new Set(collapsedFiles);
    if (newCollapsed.has(file)) {
      newCollapsed.delete(file);
    } else {
      newCollapsed.add(file);
    }
    setCollapsedFiles(newCollapsed);
  };

  const dismissFile = (file: string) => {
    setDismissedFiles((prev) => new Set([...prev, file]));
  };

  const { currentWorkspace } = useWorkspaceContext();
  const { search } = useSearchWorkspace(currentWorkspace);

  const filteredResults = searchResults.filter((result) => !dismissedFiles.has(result.details.path));
  const [open, setOpen] = useState(false);

  const [appendedResults, setAppendResults] = useState<TextSearchResultType[]>([]);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAppendResults([]);
    for await (const res of search(searchTerm)) {
      setAppendResults((prev) => [...prev, res]);
    }
  };

  return (
    <Dialog onOpenChange={(set) => setOpen(set)} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="h-full flex flex-col max-w-4xl max-h-[80vh] bg-search border-search-border text-primary-foreground">
        <DialogHeader className="border-b border-search pb-4">
          <DialogTitle className="text-primary-foreground flex items-center gap-2">
            <Search className="w-4 h-4" />
            Search
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex flex-col min-h-0">
          {/* Search Input */}
          <form onSubmit={handleSubmit} className="flex justify-center items-center gap-2">
            <Input
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-search-border border-search-border text-primary-foreground placeholder:text-muted-foreground focus:border-ring"
            />
            <Button type="submit" variant={"default"} className="text-ring">
              Search
            </Button>
          </form>
          {/* <WorkspaceSelector value={selectedWorkspace} onValueChange={setSelectedWorkspace} /> */}
          <div className="text-sm text-muted-foreground mb-3">
            {filteredResults.reduce((total, result) => total + result.matches.length, 0)} results in{" "}
            {filteredResults.length} files
          </div>

          {/* Results */}
          <div className="max-h-[50vh] overflow-y-auto space-y-1">
            {filteredResults.length > 0 ? (
              appendedResults.map((result) => (
                <SearchResultsScroll
                  result={result}
                  collapsedFiles={collapsedFiles}
                  toggleFileCollapse={toggleFileCollapse}
                  dismissFile={dismissFile}
                  key={result.details.path}
                />
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">No results found</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Dummy workspaces data
const workspaces = [
  { id: "frontend", name: "Frontend App" },
  { id: "backend", name: "Backend API" },
  { id: "docs", name: "Documentation" },
  { id: "config", name: "Configuration" },
  { id: "frontend", name: "Frontend App" },
  { id: "backend", name: "Backend API" },
  { id: "docs", name: "Documentation" },
  { id: "config", name: "Configuration" },
  { id: "frontend", name: "Frontend App" },
  { id: "backend", name: "Backend API" },
  { id: "docs", name: "Documentation" },
  { id: "config", name: "Configuration" },
  { id: "frontend", name: "Frontend App" },
  { id: "backend", name: "Backend API" },
  { id: "docs", name: "Documentation" },
  { id: "config", name: "Configuration" },
  { id: "frontend", name: "Frontend App" },
  { id: "backend", name: "Backend API" },
  { id: "docs", name: "Documentation" },
  { id: "config", name: "Configuration" },
];

interface WorkspaceSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

function SearchResultsScroll({
  result,
  collapsedFiles,
  toggleFileCollapse,
  dismissFile,
}: {
  result: TextSearchResultType;
  collapsedFiles: Set<string>;
  toggleFileCollapse: (file: string) => void;
  dismissFile: (file: string) => void;
}) {
  return (
    <div className="pb-8">
      <div className="bg-search-header-bg/80 backdrop-blur-sm gap-2 flex items-center justify-start px-3 py-2 sticky top-0 z-10 text-xs font-mono">
        <div className="rounded-md overflow-hidden">
          <Identicon input={"xxxx"} scale={4} size={5} />
        </div>
        {`wrkspc-`}
      </div>
      <div className="border border-search-border ">
        <Collapsible open={!collapsedFiles.has(result.details.path)}>
          <div className="flex items-center justify-between bg-search-header-bg px-3 py-2 hover:bg-search-row-hover transition-colors">
            <CollapsibleTrigger
              className="flex items-center gap-2 flex-1 text-left"
              onClick={() => toggleFileCollapse(result.details.path)}
            >
              {collapsedFiles.has(result.details.path) ? (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
              <FileText className="w-4 h-4 text-search-icon" />
              <span className="text-primary-foreground font-medium">{result.details.path}</span>
              <Badge variant="secondary" className="bg-search-border text-search-muted text-xs">
                {result.matches.length}
              </Badge>
            </CollapsibleTrigger>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-search-border text-muted-foreground hover:text-primary-foreground"
              onClick={() => dismissFile(result.details.path)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          <CollapsibleContent>
            <div className="bg-search-bg">
              {result.matches.map((match, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 px-6 py-1 cursor-pointer border-l-2 border-transparent hover:bg-ring transition-colors"
                >
                  <span className="text-search-muted-2 text-sm font-mono min-w-[3rem] text-right">{match.line}</span>
                  <span className="text-search-muted text-sm font-mono flex-1">
                    {match.content.split(new RegExp(`(${match.match})`, "gi")).map((part, i) =>
                      part.toLowerCase() === match.match.toLowerCase() ? (
                        <span key={i} className="bg-search-highlight-bg text-search-highlight-fg px-1">
                          {part}
                        </span>
                      ) : (
                        part
                      )
                    )}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

function WorkspaceSelector({ value, onValueChange }: WorkspaceSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-search-muted">Workspace</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="bg-search-border border-search-border text-primary-foreground focus:border-ring focus:ring-ring">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-search-header border-search-border text-primary-foreground">
          <SelectItem value="all" className="focus:bg-search-row-hover focus:text-primary-foreground">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-search-icon" />
              All Workspaces
            </div>
          </SelectItem>
          {workspaces.map((workspace, i) => (
            <SelectItem
              key={workspace.id + "" + i}
              value={workspace.id + "" + i}
              className="focus:bg-search-row-hover focus:text-primary-foreground"
            >
              <div className="flex items-center gap-2">
                {/* <workspace.icon className="w-4 h-4 text-orange-400" /> */}
                <div className="rounded-md overflow-hidden">
                  <Identicon input={workspace.name} scale={4} size={5} />
                </div>
                {workspace.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
