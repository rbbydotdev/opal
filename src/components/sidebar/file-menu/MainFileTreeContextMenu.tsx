import { useFileTreeMenuCtx } from "@/components/filetree/FileTreeMenuContext";
import { TreeNode } from "@/components/filetree/TreeNode";
import { useFiletreeMenuContextMenuActions } from "@/components/filetree/useFiletreeMenuContextMenuActions";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { getDiskTypeLabel } from "@/data/disk/DiskType";
import { useTreeExpanderContext } from "@/features/tree-expander/TreeExpanderContext";
import { DefaultFile } from "@/lib/DefaultFile";
import { Workspace } from "@/workspace/Workspace";
import { useWorkspaceFileMgmt } from "@/workspace/useWorkspaceFileMgmt";
import {
  ClipboardCopy,
  ClipboardPasteIcon,
  CopyMinus,
  FileCode2Icon,
  FileEditIcon,
  FilePlusIcon,
  FileTextIcon,
  FolderPlusIcon,
  Globe,
  Info,
  Package,
  Scissors,
  SquarePen,
  Trash2,
} from "lucide-react";
import { useMemo, useRef } from "react";
export const MainFileTreeContextMenu = ({
  children,
  fileNode,
  currentWorkspace,
  disabled,
}: {
  fileNode: TreeNode;
  children: React.ReactNode;
  currentWorkspace: Workspace;
  disabled?: boolean;
}) => {
  const { addFile, addDir, trash, copy, cut, paste, duplicate, rename } = useFiletreeMenuContextMenuActions({
    currentWorkspace,
  });
  const { addNode: addDirFile } = useWorkspaceFileMgmt(currentWorkspace);

  const { selectedFocused } = useFileTreeMenuCtx();
  const { setExpandAll } = useTreeExpanderContext();

  const diskType = useMemo(() => getDiskTypeLabel(currentWorkspace.disk.type), [currentWorkspace]);

  const addCssFile = () => addFile(fileNode, "styles.css");
  const addEjsFile = () => addFile(fileNode, "template.ejs");
  const addMustacheFile = () => addFile(fileNode, "template.mustache");
  const addNunchucksFile = () => addFile(fileNode, "template.njk");
  const addLiquidFile = () => addFile(fileNode, "template.liquid");
  const addMarkdownFile = () => addFile(fileNode, "newfile.md");
  const addJsonFile = () => addFile(fileNode, "data.json");

  // Stock file functions
  const addGlobalCssFile = () =>
    addDirFile("file", fileNode.closestDir()!, "global.css", () => Promise.resolve(DefaultFile.GlobalCSS()));
  const addHtmlFile = () =>
    addDirFile("file", fileNode.closestDir()!, "index.html", () => Promise.resolve(DefaultFile.HTML()));
  const addStockMustacheFile = () =>
    addDirFile("file", fileNode.closestDir()!, "template.mustache", () => Promise.resolve(DefaultFile.Mustache()));
  const addStockEjsFile = () =>
    addDirFile("file", fileNode.closestDir()!, "template.ejs", () => Promise.resolve(DefaultFile.EJS()));
  const addStockNunchucksFile = () =>
    addDirFile("file", fileNode.closestDir()!, "template.njk", () => Promise.resolve(DefaultFile.Nunchucks()));
  const addStockLiquidFile = () =>
    addDirFile("file", fileNode.closestDir()!, "template.liquid", () => Promise.resolve(DefaultFile.Liquid()));

  const fnRef = useRef<null | (() => void)>(null);
  const deferredFn = (fn: () => void) => {
    return () => (fnRef.current = fn);
  };
  const isRoot = fileNode.path === "/";
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild disabled={disabled}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent
        className="w-60"
        onCloseAutoFocus={(event) => {
          if (fnRef.current) {
            event.preventDefault();

            fnRef.current();
            fnRef.current = null;
          }
        }}
      >
        <ContextMenuSub>
          <ContextMenuSubTrigger inset>
            <FileTextIcon className="mr-3 h-4 w-4" />
            New Template
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onSelect={deferredFn(() => addMustacheFile())}>
              <FileTextIcon className="mr-3 h-4 w-4" />
              Mustache Template
            </ContextMenuItem>
            <ContextMenuItem onSelect={deferredFn(() => addEjsFile())}>
              <FileTextIcon className="mr-3 h-4 w-4" />
              EJS Template
            </ContextMenuItem>
            <ContextMenuItem onSelect={deferredFn(() => addNunchucksFile())}>
              <FileTextIcon className="mr-3 h-4 w-4" />
              Nunchucks Template
            </ContextMenuItem>
            <ContextMenuItem onSelect={deferredFn(() => addLiquidFile())}>
              <FileTextIcon className="mr-3 h-4 w-4" />
              Liquid Template
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem inset onSelect={deferredFn(() => addMarkdownFile())} className="w-full flex justify-start">
          <FileEditIcon className="mr-3 h-4 w-4" />
          New Markdown File
        </ContextMenuItem>
        <ContextMenuItem inset onSelect={deferredFn(() => addCssFile())}>
          <FileCode2Icon className="mr-3 h-4 w-4" />
          New CSS File
        </ContextMenuItem>
        <ContextMenuItem inset onSelect={deferredFn(() => addEjsFile())}>
          <FileTextIcon className="mr-3 h-4 w-4" />
          New EJS Template
        </ContextMenuItem>
        <ContextMenuItem inset onSelect={deferredFn(() => addJsonFile())}>
          <FilePlusIcon className="mr-3 h-4 w-4" />
          New JSON File
        </ContextMenuItem>
        <ContextMenuItem inset onSelect={deferredFn(() => addDir(fileNode))}>
          <FolderPlusIcon className="mr-3 h-4 w-4" />
          New Folder
        </ContextMenuItem>

        <ContextMenuSub>
          <ContextMenuSubTrigger inset>
            <Package className="mr-3 h-4 w-4" />
            Stock Files
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onSelect={deferredFn(() => addGlobalCssFile())}>
              <FileCode2Icon className="mr-3 h-4 w-4" />
              global.css
            </ContextMenuItem>
            <ContextMenuItem onSelect={deferredFn(() => addHtmlFile())}>
              <Globe className="mr-3 h-4 w-4" />
              index.html
            </ContextMenuItem>
            <ContextMenuItem onSelect={deferredFn(() => addStockMustacheFile())}>
              <FileTextIcon className="mr-3 h-4 w-4" />
              template.mustache
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <FileTextIcon className="mr-3 h-4 w-4" />
                Templates
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem onSelect={deferredFn(() => addStockMustacheFile())}>
                  <FileTextIcon className="mr-3 h-4 w-4" />
                  template.mustache
                </ContextMenuItem>
                <ContextMenuItem onSelect={deferredFn(() => addStockEjsFile())}>
                  <FileTextIcon className="mr-3 h-4 w-4" />
                  template.ejs
                </ContextMenuItem>
                <ContextMenuItem onSelect={deferredFn(() => addStockNunchucksFile())}>
                  <FileTextIcon className="mr-3 h-4 w-4" />
                  template.njk
                </ContextMenuItem>
                <ContextMenuItem onSelect={deferredFn(() => addStockLiquidFile())}>
                  <FileTextIcon className="mr-3 h-4 w-4" />
                  template.liquid
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />
        {!isRoot && (
          <>
            <ContextMenuItem inset onSelect={deferredFn(() => copy(currentWorkspace.nodesFromPaths(selectedFocused)))}>
              <ClipboardCopy className="mr-3 h-4 w-4" />
              Copy Files
            </ContextMenuItem>
            <ContextMenuItem inset onSelect={deferredFn(() => cut(currentWorkspace.nodesFromPaths(selectedFocused)))}>
              <Scissors className="mr-3 h-4 w-4" />
              Cut Files
            </ContextMenuItem>
          </>
        )}
        <ContextMenuItem inset onSelect={deferredFn(() => paste(fileNode))}>
          <ClipboardPasteIcon className="mr-3 h-4 w-4" />
          Paste Files
        </ContextMenuItem>

        <ContextMenuSeparator />
        {!isRoot && (
          <ContextMenuItem inset onSelect={deferredFn(() => rename(fileNode))}>
            <SquarePen className="mr-3 h-4 w-4" />
            Rename
          </ContextMenuItem>
        )}
        {!isRoot && (
          <>
            <ContextMenuItem inset onSelect={deferredFn(() => duplicate(fileNode))}>
              <FilePlusIcon className="mr-3 h-4 w-4" />
              Duplicate
            </ContextMenuItem>
            <ContextMenuItem inset onSelect={deferredFn(() => trash(fileNode, selectedFocused))}>
              <Trash2 className="mr-3 h-4 w-4" />
              Trash Files
            </ContextMenuItem>
          </>
        )}

        <ContextMenuSeparator />
        <ContextMenuItem inset onSelect={deferredFn(() => setExpandAll(false))}>
          <CopyMinus className="mr-3 h-4 w-4" />
          Collapse All
        </ContextMenuItem>
        <ContextMenuItem inset onSelect={deferredFn(() => setExpandAll(true))}>
          <CopyMinus className="mr-3 h-4 w-4" />
          Expand All
        </ContextMenuItem>
        <ContextMenuItem inset>
          <Info className="mr-3 h-4 w-4" />
          {diskType}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
