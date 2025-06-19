import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath } from "@/lib/paths2";
import { useRef } from "react";
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
  const fnRef = useRef<null | (() => void)>(null);
  const deferredFn = (fn: () => void) => {
    return () => (fnRef.current = fn);
  };
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
        <ContextMenuItem inset onClick={deferredFn(() => addFile())}>
          New File
        </ContextMenuItem>
        <ContextMenuItem inset onClick={deferredFn(() => addDir())}>
          New Dir
        </ContextMenuItem>
        <ContextMenuItem inset onClick={deferredFn(() => setEditing(fileNode.path))}>
          Rename
        </ContextMenuItem>
        <ContextMenuItem inset onClick={deferredFn(() => duplicateFile(fileNode))}>
          Duplicate
        </ContextMenuItem>
        <ContextMenuItem inset onClick={deferredFn(() => removeFile(fileNode.path))}>
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
