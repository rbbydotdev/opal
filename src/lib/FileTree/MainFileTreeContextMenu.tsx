import { useFiletreeMenuContextMenuActions } from "@/components/FiletreeMenu";
import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Workspace } from "@/Db/Workspace";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import {
  ClipboardCopy,
  ClipboardPasteIcon,
  FilePlusIcon,
  FolderPlusIcon,
  Scissors,
  SquarePen,
  Trash2,
} from "lucide-react";
import { useRef } from "react";
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
        className="w-52"
        onCloseAutoFocus={(event) => {
          if (fnRef.current) {
            event.preventDefault();
            fnRef.current();
            fnRef.current = null;
          }
        }}
      >
        <ContextMenuItem inset onClick={deferredFn(() => addFile(fileNode))} className="w-full flex justify-start">
          <FilePlusIcon className="mr-3 h-4 w-4" />
          New File
        </ContextMenuItem>
        <ContextMenuItem inset onClick={deferredFn(() => addDir(fileNode))}>
          <FolderPlusIcon className="mr-3 h-4 w-4" />
          New Dir
        </ContextMenuItem>
        {!isRoot && (
          <ContextMenuItem inset onClick={deferredFn(() => rename(fileNode))}>
            <SquarePen className="mr-3 h-4 w-4" />
            Rename
          </ContextMenuItem>
        )}
        {!isRoot && (
          <>
            <ContextMenuItem inset onClick={deferredFn(() => copy(currentWorkspace.nodesFromPaths(selectedFocused)))}>
              <ClipboardCopy className="mr-3 h-4 w-4" />
              Copy
            </ContextMenuItem>
            <ContextMenuItem inset onClick={deferredFn(() => cut(currentWorkspace.nodesFromPaths(selectedFocused)))}>
              <Scissors className="mr-3 h-4 w-4" />
              Cut
            </ContextMenuItem>
          </>
        )}
        <ContextMenuItem inset onClick={deferredFn(() => paste(fileNode))}>
          <ClipboardPasteIcon className="mr-3 h-4 w-4" />
          Paste
        </ContextMenuItem>
        {!isRoot && (
          <>
            <ContextMenuItem inset onClick={deferredFn(() => duplicate(fileNode))}>
              <FilePlusIcon className="mr-3 h-4 w-4" />
              Duplicate
            </ContextMenuItem>
            <ContextMenuItem inset onClick={deferredFn(() => trash(fileNode, selectedFocused))}>
              <Trash2 className="mr-3 h-4 w-4" />
              Trash
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
