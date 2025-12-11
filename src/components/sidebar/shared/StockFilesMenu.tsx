import { ROOT_NODE } from "@/components/filetree/TreeNode";
import { useStockFile } from "@/components/sidebar/shared/useStockFile";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DefaultFile } from "@/lib/DefaultFile";
import { cn } from "@/lib/utils";
import { FileCode2Icon, FileTextIcon, Globe, Package } from "lucide-react";
import { ComponentProps, ReactNode, useRef } from "react";

const ActionButton = ({
  children,
  className,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Button>) => {
  return (
    <Button {...rest} className={cn("p-1 m-0 h-auto !bg-transparent", className)} variant="ghost">
      {children}
    </Button>
  );
};

function StockFilesMenuContent({ deferFn }: { deferFn: (fn: () => void) => () => void }) {
  const addStockFile = useStockFile();

  return (
    <>
      <DropdownMenuItem onClick={deferFn(() => addStockFile("global.css", DefaultFile.GlobalCSS(), ROOT_NODE))}>
        <FileCode2Icon className="w-4 h-4 mr-2" />
        global.css (github.md)
      </DropdownMenuItem>
      <DropdownMenuItem onClick={deferFn(() => addStockFile("global.css", DefaultFile.PicoCSS(), ROOT_NODE))}>
        <FileCode2Icon className="w-4 h-4 mr-2" />
        global.css (pico.css)
      </DropdownMenuItem>
      <DropdownMenuItem onClick={deferFn(() => addStockFile("index.html", DefaultFile.HTML()))}>
        <Globe className="w-4 h-4 mr-2" />
        index.html
      </DropdownMenuItem>
      <DropdownMenuItem onClick={deferFn(() => addStockFile("template.mustache", DefaultFile.Mustache()))}>
        <FileTextIcon className="w-4 h-4 mr-2" />
        template.mustache
      </DropdownMenuItem>
      <DropdownMenuItem onClick={deferFn(() => addStockFile("template.ejs", DefaultFile.EJS()))}>
        <FileTextIcon className="w-4 h-4 mr-2" />
        template.ejs
      </DropdownMenuItem>
    </>
  );
}

function StockFilesDropdown({ children }: { children: ReactNode }) {
  const deferredFn = useRef<null | (() => void)>(null);
  const deferFn = (fn: () => void) => {
    return () => (deferredFn.current = fn);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          if (deferredFn.current) {
            deferredFn.current();
            deferredFn.current = null;
          }
        }}
      >
        <StockFilesMenuContent deferFn={deferFn} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface StockFilesMenuProps {
  variant?: "icon" | "button";
  className?: string;
}

export function StockFilesMenu({ variant = "icon", className }: StockFilesMenuProps) {
  if (variant === "icon") {
    return (
      <Tooltip>
        <StockFilesDropdown>
          <TooltipTrigger asChild>
            <ActionButton className={className} aria-label="Stock Files" title="Stock Files">
              <Package />
            </ActionButton>
          </TooltipTrigger>
        </StockFilesDropdown>
        <TooltipContent>Stock Files</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <StockFilesDropdown>
      <Button className={cn("text-xs", className)} size="sm" variant="outline">
        <Package className="w-4 h-4 mr-2" />
        Stock Files
      </Button>
    </StockFilesDropdown>
  );
}
