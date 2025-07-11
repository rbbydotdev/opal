import { useFiletreeMenuContextMenuActions } from "@/components/FiletreeMenu";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Workspace } from "@/Db/Workspace";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { Delete, Undo } from "lucide-react";
import { useRef } from "react";
export const TrashFileTreeContextMenu = ({
  children,
  currentWorkspace,
  fileNode,
}: {
  children: React.ReactNode;
  currentWorkspace: Workspace;
  fileNode: TreeNode;
}) => {
  const fnRef = useRef<null | (() => void)>(null);
  const deferredFn = (fn: () => void) => {
    return () => (fnRef.current = fn);
  };

  const { untrash, remove } = useFiletreeMenuContextMenuActions({
    currentWorkspace,
  });
  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
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
        <ContextMenuItem inset onClick={deferredFn(() => untrash(fileNode))}>
          <Undo className="mr-3 h-4 w-4" />
          Put Back
        </ContextMenuItem>
        <ContextMenuItem inset onClick={deferredFn(() => remove(fileNode))}>
          <Delete className="mr-3 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
