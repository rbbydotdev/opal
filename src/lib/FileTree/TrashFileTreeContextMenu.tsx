import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useFiletreeMenuContextMenuActions } from "@/components/useFiletreeMenuContextMenuActions";
import { SpecialDirs } from "@/data/SpecialDirs";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { Workspace } from "@/workspace/Workspace";
import { Delete, Undo } from "lucide-react";
import { useRef } from "react";
export const TrashFileTreeContextMenu = ({
  children,
  currentWorkspace,
  fileNode,
  disabled,
}: {
  children: React.ReactNode;
  currentWorkspace: Workspace;
  fileNode: TreeNode;
  disabled?: boolean;
}) => {
  const fnRef = useRef<null | (() => void)>(null);
  const deferredFn = (fn: () => void) => {
    return () => (fnRef.current = fn);
  };

  const { selectedRange } = useFileTreeMenuCtx();
  const { untrash, remove } = useFiletreeMenuContextMenuActions({
    currentWorkspace,
  });
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
        {isRoot && (
          <ContextMenuItem className="flex gap-2" onClick={() => remove(SpecialDirs.Trash)}>
            <Delete className="mr-3 h-4 w-4" />
            Empty
          </ContextMenuItem>
        )}
        {!isRoot && (
          <>
            <ContextMenuItem inset onClick={deferredFn(() => untrash(selectedRange, fileNode))}>
              <Undo className="mr-3 h-4 w-4" />
              Put Back
            </ContextMenuItem>
            <ContextMenuItem inset onClick={deferredFn(() => remove(selectedRange, fileNode))}>
              <Delete className="mr-3 h-4 w-4" />
              Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
