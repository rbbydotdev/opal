import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CollapsibleContent } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { ChevronRight, FileTextIcon, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const lines = new Array(100).fill(0);
export function WorkspaceSearchDialog({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  useEffect(() => {
    //high priority window listener for cmd/ctr + shift + f
    const handleKeyDown = (e: KeyboardEvent) => {
      //TODO i need to move these keyboard short cuts to a central place so they can be configured!
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="sm:max-w-[425px] h-[425px] flex-col flex"
        onEscapeKeyDown={(event) => {
          // if (document.activeElement?.hasAttribute("data-search-file-expand")) {
          if ((document.activeElement as HTMLElement | null)?.dataset?.searchFileExpand) {
            event.preventDefault();
          }
        }}
      >
        <DialogTitle className="font-mono font-thin text-xs flex items-center gap-2 -mt-4 -ml-4 mb-2">
          <Search size={16} /> search
        </DialogTitle>
        <Collapsible className="group/collapsible">
          <div className="flex">
            <CollapsibleTrigger className="text-2xs flex items-center -ml-3 mr-1 outline-none" asChild>
              <button className="ouline-none">
                <ChevronRight
                  size={14}
                  className={
                    "outline-none w-4 transition-transform duration-100 group-data-[state=open]/collapsible:rotate-90 group-data-[state=closed]/collapsible:rotate-0 -ml-2"
                  }
                />
              </button>
            </CollapsibleTrigger>
            <Input className="outline-ring border bg-sidebar font-mono" placeholder="search workspace..." />
          </div>
          <CollapsibleContent>
            <div className="flex items-center gap-2 mt-4">
              <Checkbox id="all_workspaces" />
              <Label className="text-2xs font-mono text-primary flex items-center gap-1" htmlFor="all_workspaces">
                <span>all workspaces</span>
              </Label>
            </div>
          </CollapsibleContent>
        </Collapsible>
        <div className="bg-sidebar h-full overflow-y-scroll no-scrollbar">
          <SearchResults />
        </div>
      </DialogContent>
    </Dialog>
  );
}
const MAX_HEIGHT = 5;
function SearchFile({ closeFile, title }: { closeFile: () => void; title: string }) {
  const [expanded, setExpanded] = useState(() => !(lines.length > MAX_HEIGHT));
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const filteredLines = useMemo(() => lines.filter((_, i) => i < MAX_HEIGHT || expanded), [expanded]);
  return (
    <>
      <div className="w-full flex items-center border rounded-t text-2xs font-mono bg-accent h-8 sticky top-0 z-10">
        <div className="ml-1 text-ring">
          <FileTextIcon size={12} />
        </div>
        <div title={title} className="flex-1 min-w-0 truncate px-2 py-2">
          {title}
        </div>
        <Button variant="ghost" className="flex-shrink-0 h-5 w-5 p-0 mr-2 ml-2" onClick={closeFile}>
          <X size={14} />
        </Button>
      </div>
      <div className="border mt-1">
        {filteredLines.map((_, i) => (
          <SearchLine key={i} />
        ))}
        <Button
          variant="ghost"
          size="sm"
          tabIndex={0}
          data-search-file-expand
          className="w-full flex justify-center h-4 items-center bg-primary/5 mt-1 rounded-none"
          onClick={() => {
            setExpanded(!expanded);
          }}
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
          <span className="p-0.5 text-primary/80 text-3xs font-mono">expand</span>
        </Button>
      </div>
    </>
  );
}

function SearchResults() {
  const [files, setFiles] = useState(() => new Array(10).fill(0));
  return (
    <ul className="block">
      <li className="block">
        {files.map((_, i) => (
          <div key={i} className="mb-4">
            <SearchFile
              closeFile={() => setFiles((prev) => prev.slice(1))}
              title={`/some/file${i}${i}${i}.md/some/file.md/some/file.md/some/file.md/some/END`}
            />
          </div>
        ))}
      </li>
    </ul>
  );
}
function SearchLine() {
  return (
    <div
      data-line="1:"
      className="before:min-w-6 before:inline-block  before:font-bold whitespace-nowrap truncate p-1 bg-primary-foreground font-mono text-2xs before:content-[attr(data-line)] before:mr-1"
    >
      Lorem <span className="bg-highlight">ipsum</span> dolor sit amet, <span className="bg-highlight">ipsum</span>{" "}
      <span className="bg-highlight">ipsum</span> consectetur adipiscing elit. Sed do eiusmod tempor{" "}
      <span className="bg-highlight">ipsum</span> incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
      quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
    </div>
  );
}
