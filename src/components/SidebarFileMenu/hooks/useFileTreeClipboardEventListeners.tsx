import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { MetaDataTransfer } from "@/components/MetaDataTransfer";
import { useFileMenuPaste } from "@/components/SidebarFileMenu/hooks/useFileMenuPaste";
import { Workspace } from "@/Db/Workspace";
import { copyFileNodesToClipboard } from "@/features/filetree-copy-paste/copyFileNodesToClipboard";
import { useEffect } from "react";

export function useFileTreeClipboardEventListeners({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const { focused, selectedFocused, setFileTreeCtx: setFileTreeCtx } = useFileTreeMenuCtx();
  const handlePaste = useFileMenuPaste({ currentWorkspace });

  useEffect(() => {
    const handlePasteEvent = async (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      const targetNode = currentWorkspace.tryNodeFromPath(selectedFocused[0]);
      if (target?.closest?.("[data-sidebar-file-menu]")) {
        await handlePaste({ targetNode, data: new MetaDataTransfer(event.clipboardData!) });
        setFileTreeCtx({
          editing: null,
          editType: null,
          focused: null,
          virtual: null,
          selectedRange: [],
        });
      }
    };
    const handleCutEvent = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("[data-sidebar-file-menu]")) {
        return copyFileNodesToClipboard({
          fileNodes: currentWorkspace.nodesFromPaths(selectedFocused),
          action: "cut",
          workspaceId: currentWorkspace.name,
        });
      }
    };
    const handleCopyEvent = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("[data-sidebar-file-menu]")) {
        return copyFileNodesToClipboard({
          fileNodes: currentWorkspace.nodesFromPaths(selectedFocused),
          action: "copy",
          workspaceId: currentWorkspace.name,
        });
      }
    };
    //should i just listen on "[data-sidebar-file-menu] ???
    window.addEventListener("paste", handlePasteEvent);
    window.addEventListener("cut", handleCutEvent);
    window.addEventListener("copy", handleCopyEvent);
    return () => {
      window.removeEventListener("paste", handlePasteEvent);
      window.removeEventListener("cut", handleCutEvent);
      window.removeEventListener("copy", handleCopyEvent);
    };
  }, [currentWorkspace, focused, selectedFocused, setFileTreeCtx, handlePaste]);
}
