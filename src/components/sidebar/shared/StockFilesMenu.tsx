import { useFileTreeMenuCtx } from "@/app/filemenu/FileTreeMenuCtxProvider";
import { ROOT_NODE, TreeNode } from "@/components/sidebar/FileTree/TreeNode";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { useTreeExpanderContext } from "@/features/tree-expander/useTreeExpander";
import { DefaultFile } from "@/lib/DefaultFile";
import { absPath } from "@/lib/paths2";
import { cn } from "@/lib/utils";
import { useWorkspaceFileMgmt } from "@/workspace/useWorkspaceFileMgmt";
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
  const { currentWorkspace } = useWorkspaceContext();
  const { focused } = useFileTreeMenuCtx();
  const { addDirFile } = useWorkspaceFileMgmt(currentWorkspace);
  const { expandForNode } = useTreeExpanderContext();

  const addStockFile = (filename: string, content: string, dir?: TreeNode) => {
    const node = addDirFile("file", dir?.path || focused || absPath("/"), filename, content);
    if (expandForNode) {
      expandForNode(node, true);
    }
  };

  return (
    <>
      <DropdownMenuItem onClick={deferFn(() => addStockFile("global.css", DefaultFile.GlobalCSS(), ROOT_NODE))}>
        <FileCode2Icon className="w-4 h-4 mr-2" />
        global.css
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
