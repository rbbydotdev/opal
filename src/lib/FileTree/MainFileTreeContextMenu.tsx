import { useFiletreeMenuContextMenuActions } from "@/components/FiletreeMenu";
import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { getDiskTypeLabel } from "@/Db/Disk";
import { Workspace } from "@/Db/Workspace";
import { useTreeExpanderContext } from "@/features/tree-expander/useTreeExpander";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import {
  ClipboardCopy,
  ClipboardPasteIcon,
  CopyMinus,
  FileCode2Icon,
  FileEditIcon,
  FilePlusIcon,
  FileTextIcon,
  FolderPlusIcon,
  Info,
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

  const { selectedFocused } = useFileTreeMenuCtx();
  const { setExpandAll } = useTreeExpanderContext();

  const diskType = useMemo(() => getDiskTypeLabel(currentWorkspace.getDisk().type), [currentWorkspace]);

  const addCssFile = () => addFile(fileNode, "styles.css");
  const addEjsFile = () => addFile(fileNode, "template.ejs");
  const addMustacheFile = () => addFile(fileNode, "template.mustache");
  const addMarkdownFile = () => addFile(fileNode, "newfile.md");

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
        <ContextMenuItem inset onClick={deferredFn(() => addMustacheFile())}>
          <FileTextIcon className="mr-3 h-4 w-4" />
          New Mustache Template
        </ContextMenuItem>
        <ContextMenuItem inset onClick={deferredFn(() => addMarkdownFile())} className="w-full flex justify-start">
          <FileEditIcon className="mr-3 h-4 w-4" />
          New Markdown File
        </ContextMenuItem>
        <ContextMenuItem inset onClick={deferredFn(() => addCssFile())}>
          <FileCode2Icon className="mr-3 h-4 w-4" />
          New CSS File
        </ContextMenuItem>
        <ContextMenuItem inset onClick={deferredFn(() => addEjsFile())}>
          <FileTextIcon className="mr-3 h-4 w-4" />
          New EJS Template
        </ContextMenuItem>
        <ContextMenuItem inset onClick={deferredFn(() => addDir(fileNode))}>
          <FolderPlusIcon className="mr-3 h-4 w-4" />
          New Folder
        </ContextMenuItem>

        <ContextMenuSeparator />
        {!isRoot && (
          <>
            <ContextMenuItem inset onClick={deferredFn(() => copy(currentWorkspace.nodesFromPaths(selectedFocused)))}>
              <ClipboardCopy className="mr-3 h-4 w-4" />
              Copy Files
            </ContextMenuItem>
            <ContextMenuItem inset onClick={deferredFn(() => cut(currentWorkspace.nodesFromPaths(selectedFocused)))}>
              <Scissors className="mr-3 h-4 w-4" />
              Cut Files
            </ContextMenuItem>
          </>
        )}
        <ContextMenuItem inset onClick={deferredFn(() => paste(fileNode))}>
          <ClipboardPasteIcon className="mr-3 h-4 w-4" />
          Paste Files
        </ContextMenuItem>

        <ContextMenuSeparator />
        {!isRoot && (
          <ContextMenuItem inset onClick={deferredFn(() => rename(fileNode))}>
            <SquarePen className="mr-3 h-4 w-4" />
            Rename
          </ContextMenuItem>
        )}
        {!isRoot && (
          <>
            <ContextMenuItem inset onClick={deferredFn(() => duplicate(fileNode))}>
              <FilePlusIcon className="mr-3 h-4 w-4" />
              Duplicate
            </ContextMenuItem>
            <ContextMenuItem inset onClick={deferredFn(() => trash(fileNode, selectedFocused))}>
              <Trash2 className="mr-3 h-4 w-4" />
              Trash Files
            </ContextMenuItem>
          </>
        )}

        <ContextMenuSeparator />
        <ContextMenuItem inset onClick={deferredFn(() => setExpandAll(false))}>
          <CopyMinus className="mr-3 h-4 w-4" />
          Collapse All
        </ContextMenuItem>
        <ContextMenuItem inset onClick={deferredFn(() => setExpandAll(true))}>
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
