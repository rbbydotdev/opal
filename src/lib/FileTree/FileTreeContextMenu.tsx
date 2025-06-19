import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useRef } from "react";
export const FileTreeContextMenu = ({
  children,
  removeFile,
  copyFile,
  duplicate,
  rename,
  addFile,
  addDir,
}: {
  removeFile: () => void;
  duplicate: () => void;
  rename: () => void;
  addFile: () => void;
  copyFile: () => void;
  addDir: () => void;
  children: React.ReactNode;
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
        {/* < */}
        {/* copyFileNodesToClipboard */}

        <ContextMenuItem inset onClick={deferredFn(() => addFile())}>
          New File
        </ContextMenuItem>
        <ContextMenuItem inset onClick={deferredFn(() => addDir())}>
          New Dir
        </ContextMenuItem>
        <ContextMenuItem inset onClick={deferredFn(() => rename())}>
          Rename
        </ContextMenuItem>
        <ContextMenuItem inset onClick={deferredFn(() => copyFile())}>
          Copy
        </ContextMenuItem>
        <ContextMenuItem inset onClick={deferredFn(() => duplicate())}>
          Duplicate
        </ContextMenuItem>
        <ContextMenuItem inset onClick={deferredFn(() => removeFile())}>
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
