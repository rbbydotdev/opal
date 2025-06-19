import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath } from "@/lib/paths2";
import { useCallback, useRef } from "react";
export const FileTreeContextMenu = ({
  children,
  fileNode,
  removeFile,
  duplicateFile,
  setEditing,
  addFile,
  addDir,
}: {
  removeFile: (filePath: string) => void;
  duplicateFile: (fileNode: TreeNode) => void;
  setEditing: (filePath: AbsPath) => void;
  addFile: () => void;
  addDir: () => void;
  children: React.ReactNode;
  fileNode: TreeNode;
}) => {
  const execOnCloseRef = useRef<null | (() => void)>(null);
  const execOnClose = useCallback((fn: () => void) => {
    execOnCloseRef.current = fn;
  }, []);
  const handleOpenChange = useCallback((state: boolean) => {
    if (state === false) {
      queueMicrotask(() => {
        execOnCloseRef.current?.();
        execOnCloseRef.current = null;
      });
    }
  }, []);

  // addFile={() => expandForNode(addDirFile("file"), true)}
  // addDir={() => expandForNode(addDirFile("dir"), true)}

  return (
    <ContextMenu onOpenChange={handleOpenChange}>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        {/* addFile={() => expandForNode(addDirFile("file"), true)}
              addDir={() => expandForNode(addDirFile("dir"), true)} */}
        <ContextMenuItem inset onClick={addFile}>
          New File
        </ContextMenuItem>
        <ContextMenuItem inset onClick={addDir}>
          New Dir
        </ContextMenuItem>
        <ContextMenuItem inset onClick={() => execOnClose(() => setEditing(fileNode.path))}>
          Rename
        </ContextMenuItem>
        <ContextMenuItem inset onClick={() => execOnClose(() => duplicateFile(fileNode))}>
          Duplicate
        </ContextMenuItem>
        <ContextMenuItem inset onClick={() => removeFile(fileNode.path)}>
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
