import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Delete, FilePlusIcon, FolderPlusIcon, SquarePen } from "lucide-react";
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

        <ContextMenuItem inset onClick={deferredFn(() => addFile())} className="w-full flex justify-start">
          <FilePlusIcon className="mr-3 h-4 w-4" />
          New File
        </ContextMenuItem>
        <ContextMenuItem inset onClick={deferredFn(() => addDir())}>
          <FolderPlusIcon className="mr-3 h-4 w-4" />
          New Dir
        </ContextMenuItem>
        <ContextMenuItem inset onClick={deferredFn(() => rename())}>
          <SquarePen className="mr-3 h-4 w-4" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem inset onClick={deferredFn(() => copyFile())}>
          <FilePlusIcon className="mr-3 h-4 w-4" />
          Copy
        </ContextMenuItem>
        <ContextMenuItem inset onClick={deferredFn(() => duplicate())}>
          <FilePlusIcon className="mr-3 h-4 w-4" />
          Duplicate
        </ContextMenuItem>
        <ContextMenuItem inset onClick={deferredFn(() => removeFile())}>
          <Delete className="mr-3 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
