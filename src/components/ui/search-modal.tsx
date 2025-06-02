"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, FileText, Search, X } from "lucide-react";
import { useState } from "react";

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

export default function Component({ children }: { children: React.ReactNode }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
  const [dismissedFiles, setDismissedFiles] = useState<Set<string>>(new Set());

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

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Dialog onOpenChange={(set) => setOpen(set)} open={open}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-[#1e1e1e] border-[#3c3c3c] text-white">
          <DialogHeader className="border-b border-[#3c3c3c] pb-4">
            <DialogTitle className="text-white flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="space-y-2">
              <Input
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#3c3c3c] border-[#3c3c3c] text-white placeholder:text-gray-400 focus:border-[#007acc] focus:ring-[#007acc]"
              />
            </div>

            {/* Results */}
            <div className="max-h-[50vh] overflow-y-auto space-y-1">
              {filteredResults.length > 0 ? (
                <>
                  <div className="text-sm text-gray-400 mb-3">
                    {filteredResults.reduce((total, result) => total + result.matches.length, 0)} results in{" "}
                    {filteredResults.length} files
                  </div>
                  {filteredResults.map((result) => (
                    <div key={result.file} className="border border-[#3c3c3c] rounded">
                      <Collapsible open={!collapsedFiles.has(result.file)}>
                        <div className="flex items-center justify-between bg-[#2d2d30] px-3 py-2 hover:bg-[#37373d] transition-colors">
                          <CollapsibleTrigger
                            className="flex items-center gap-2 flex-1 text-left"
                            onClick={() => toggleFileCollapse(result.file)}
                          >
                            {collapsedFiles.has(result.file) ? (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                            <FileText className="w-4 h-4 text-blue-400" />
                            <span className="text-white font-medium">{result.file}</span>
                            <Badge variant="secondary" className="bg-[#3c3c3c] text-gray-300 text-xs">
                              {result.matches.length}
                            </Badge>
                          </CollapsibleTrigger>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-[#3c3c3c] text-gray-400 hover:text-white"
                            onClick={() => dismissFile(result.file)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <CollapsibleContent>
                          <div className="bg-[#1e1e1e]">
                            {result.matches.map((match, index) => (
                              <div
                                key={index}
                                className="flex items-start gap-3 px-6 py-1 hover:bg-[#2a2d2e] cursor-pointer border-l-2 border-transparent hover:border-[#007acc] transition-colors"
                              >
                                <span className="text-gray-500 text-sm font-mono min-w-[3rem] text-right">
                                  {match.line}
                                </span>
                                <span className="text-gray-300 text-sm font-mono flex-1">
                                  {match.content.split(new RegExp(`(${match.match})`, "gi")).map((part, i) =>
                                    part.toLowerCase() === match.match.toLowerCase() ? (
                                      <span key={i} className="bg-[#613a00] text-[#ffcc02] px-1">
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
                </>
              ) : (
                <div className="text-center text-gray-400 py-8">No results found</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
