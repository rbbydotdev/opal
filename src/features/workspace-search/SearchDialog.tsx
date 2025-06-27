import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CollapsibleContent } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { ChevronRight, FileTextIcon, Search, X } from "lucide-react";
import Link from "next/link";
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
        className="sm:max-w-[720px]  max-h-[90svh] flex-col flex"
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
          <div className="flex">
            <CollapsibleTrigger className="text-xs flex items-center -ml-3 mr-1 outline-none" asChild>
              <button className="ouline-none">
                <ChevronRight
                  size={14}
                  className={
                    "outline-none w-4 transition-transform duration-100 group-data-[state=open]/collapsible:rotate-90 group-data-[state=closed]/collapsible:rotate-0 -ml-2"
                  }
                />
              </button>
            </CollapsibleTrigger>
            <Input
              ref={(ref) => ref?.select()}
              className="md:text-xs text-xs outline-ring border bg-sidebar font-mono"
              placeholder="search workspace..."
            />
          </div>
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
        <div className="h-full overflow-y-scroll no-scrollbar">
          <SearchResults />
        </div>
      </DialogContent>
    </Dialog>
  );
}
const MAX_HEIGHT = 5;
function SearchFile({ closeFile, filePath }: { closeFile: () => void; filePath: string }) {
  const [expanded, setExpanded] = useState(() => !(lines.length > MAX_HEIGHT));
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const filteredLines = useMemo(() => lines.filter((_, i) => i < MAX_HEIGHT || expanded), [expanded]);
  return (
    <div className="mb-4 rounded-b-lg">
      <Link
        title={filePath}
        href={filePath}
        className="w-full flex items-center border rounded-t text-xs font-mono h-8 sticky top-0 z-10 bg-accent hover:bg-primary-foreground"
      >
        <div className="ml-1 text-ring">
          <FileTextIcon size={12} />
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
      <div className="mt-1 ">
        <div className="">
          {filteredLines.map((_, i) => (
            <SearchLine key={i} />
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          tabIndex={0}
          data-search-file-expand
          className="!rounded-b-lg w-full flex justify-center h-4 items-center bg-primary/5 mt-1 rounded-none"
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
    </div>
  );
}

function SearchResults() {
  const [files, setFiles] = useState(() => new Array(10).fill(0));
  return (
    <ul className="block">
      <li className="block">
        {files.map((_, i) => (
          <SearchFile
            key={i}
            closeFile={() => setFiles((prev) => prev.slice(1))}
            filePath={`/some/file${i}${i}${i}.md/some/file.md/some/file.md/some/file.md/some/END`}
          />
        ))}
      </li>
    </ul>
  );
}
function SearchLine() {
  return (
    <div
      data-line="1:"
      className="before:min-w-6 before:inline-block  before:font-bold whitespace-nowrap truncate p-1 bg-primary-foreground font-mono text-xs before:content-[attr(data-line)] before:mr-1"
    >
      Lorem <span className="bg-highlight">ipsum</span> dolor sit amet, <span className="bg-highlight">ipsum</span>{" "}
      <span className="bg-highlight">ipsum</span> consectetur adipiscing elit. Sed do eiusmod tempor{" "}
      <span className="bg-highlight">ipsum</span> incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
      quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
    </div>
  );
}
