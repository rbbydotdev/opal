"use client";

import Identicon from "@/components/Identicon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { SearchWorkspace } from "@/workers/SearchWorker/SearchWorkspace";
import { ChevronDown, ChevronRight, FileText, Globe, Search, X } from "lucide-react";
import { useCallback, useState } from "react";

// Dummy search results data
const searchResults = [
  {
    file: "src/components/ui/button.tsx",
    matches: [
      { line: 12, content: "export const Button = React.forwardRef<", match: "Button" },
      {
        line: 25,
        content: "  return <button className={cn(buttonVariants({ variant, size }), className)}",
        match: "button",
      },
      { line: 45, content: 'Button.displayName = "Button"', match: "Button" },
    ],
  },
  {
    file: "src/app/page.tsx",
    matches: [
      { line: 8, content: '        <Button variant="default">Click me</Button>', match: "Button" },
      { line: 12, content: '        <Button variant="outline">Secondary</Button>', match: "Button" },
    ],
  },
  {
    file: "src/lib/utils.ts",
    matches: [
      { line: 15, content: "export function cn(...inputs: ClassValue[]) {", match: "function" },
      { line: 20, content: "// Helper function for merging classes", match: "function" },
    ],
  },
  {
    file: "README.md",
    matches: [
      { line: 1, content: "# My Project", match: "Project" },
      { line: 5, content: "This project uses Next.js and TypeScript", match: "project" },
      { line: 12, content: "## Getting Started with the project", match: "project" },
    ],
  },
  {
    file: "package.json",
    matches: [
      { line: 2, content: '  "name": "my-project",', match: "project" },
      { line: 15, content: '    "@types/node": "^20.0.0",', match: "node" },
    ],
  },
];

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

  const filteredResults = searchResults.filter((result) => !dismissedFiles.has(result.file));
  const [open, setOpen] = useState(false);

  const { currentWorkspace } = useWorkspaceContext();
  const search = useCallback(
    async (term: string) => {
      const scanner = SearchWorkspace(currentWorkspace, term);
      console.log(currentWorkspace.disk.fileTree.root.children);
      for await (const result of scanner) {
        console.log(result);
      }
    },
    [currentWorkspace]
  );

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
          <div className="flex justify-center items-center gap-2">
            <Input
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-search-border border-[hsl(var(--search-border))] text-[hsl(var(--primary-foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-ring"
            />
            <Button variant={"default"} className="text-ring" onClick={() => search(searchTerm)}>
              Search
            </Button>
          </div>
          <WorkspaceSelector value={selectedWorkspace} onValueChange={setSelectedWorkspace} />
          <div className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
            {filteredResults.reduce((total, result) => total + result.matches.length, 0)} results in{" "}
            {filteredResults.length} files
          </div>

          {/* Results */}
          <div className="max-h-[50vh] overflow-y-auto space-y-1">
            {filteredResults.length > 0 ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="pb-8">
                    <div className="bg-[hsl(var(--search-header-bg))]/80 backdrop-blur-sm gap-2 flex items-center justify-start px-3 py-2 sticky top-0 z-10 text-xs font-mono">
                      <div className="rounded-md overflow-hidden">
                        <Identicon input={i + "xxxx"} scale={4} size={5} />
                      </div>
                      {`wrkspc-${i}x${i}x${i}`}
                    </div>
                    {filteredResults.map((result) => (
                      <div key={result.file} className="border border-[hsl(var(--search-border))] ">
                        <Collapsible open={!collapsedFiles.has(result.file)}>
                          <div className="flex items-center justify-between bg-[hsl(var(--search-header-bg))] px-3 py-2 hover:bg-[hsl(var(--search-row-hover))] transition-colors">
                            <CollapsibleTrigger
                              className="flex items-center gap-2 flex-1 text-left"
                              onClick={() => toggleFileCollapse(result.file)}
                            >
                              {collapsedFiles.has(result.file) ? (
                                <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                              )}
                              <FileText className="w-4 h-4 text-[hsl(var(--search-icon))]" />
                              <span className="text-[hsl(var(--primary-foreground))] font-medium">{result.file}</span>
                              <Badge
                                variant="secondary"
                                className="bg-[hsl(var(--search-border))] text-[hsl(var(--search-muted))] text-xs"
                              >
                                {result.matches.length}
                              </Badge>
                            </CollapsibleTrigger>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-[hsl(var(--search-border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary-foreground))]"
                              onClick={() => dismissFile(result.file)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                          <CollapsibleContent>
                            <div className="bg-[hsl(var(--search-bg))]">
                              {result.matches.map((match, index) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-3 px-6 py-1 cursor-pointer border-l-2 border-transparent hover:bg-ring transition-colors"
                                >
                                  <span className="text-[hsl(var(--search-muted-2))] text-sm font-mono min-w-[3rem] text-right">
                                    {match.line}
                                  </span>
                                  <span className="text-[hsl(var(--search-muted))] text-sm font-mono flex-1">
                                    {match.content.split(new RegExp(`(${match.match})`, "gi")).map((part, i) =>
                                      part.toLowerCase() === match.match.toLowerCase() ? (
                                        <span
                                          key={i}
                                          className="bg-[hsl(var(--search-highlight-bg))] text-[hsl(var(--search-highlight-fg))] px-1"
                                        >
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
                    ))}
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center text-[hsl(var(--muted-foreground))] py-8">No results found</div>
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
