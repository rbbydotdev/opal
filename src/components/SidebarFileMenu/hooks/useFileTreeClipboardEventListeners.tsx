import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { MetaDataTransfer } from "@/components/MetaDataTransfer";
import { useFileMenuPaste } from "@/components/SidebarFileMenu/hooks/useFileMenuPaste";
import { Workspace } from "@/Db/Workspace";
import { copyFileNodesToClipboard } from "@/features/filetree-copy-paste/copyFileNodesToClipboard";
import { useEffect } from "react";

export function useFileTreeClipboardEventListeners({
  currentWorkspace,
  elementSelector = "[data-sidebar-file-menu]",
}: {
  currentWorkspace: Workspace;
  elementSelector?: string;
}) {
  const { focused, editing, selectedFocused, setFileTreeCtx: setFileTreeCtx } = useFileTreeMenuCtx();
  const handlePaste = useFileMenuPaste({ currentWorkspace });

  //check editing or else copying filenames gives the node not the name!
  useEffect(() => {
    const handlePasteEvent = async (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      const targetNode = currentWorkspace.tryNodeFromPath(selectedFocused[0]);
      if (target?.closest?.(elementSelector) && !editing) {
        await handlePaste({ targetNode, data: new MetaDataTransfer(event.clipboardData!) });
        setFileTreeCtx(() => ({
          anchorIndex: -1,
          editing: null,
          editType: null,
          focused: null,
          virtual: null,
          selectedRange: [],
        }));
      }
    };
    const handleCutEvent = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.(elementSelector) && !editing) {
        return copyFileNodesToClipboard({
          fileNodes: currentWorkspace.nodesFromPaths(selectedFocused),
          action: "cut",
          workspaceId: currentWorkspace.id,
        });
      }
    };
    const handleCopyEvent = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.(elementSelector) && !editing) {
        return copyFileNodesToClipboard({
          fileNodes: currentWorkspace.nodesFromPaths(selectedFocused),
          action: "copy",
          workspaceId: currentWorkspace.id,
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
  }, [currentWorkspace, focused, selectedFocused, setFileTreeCtx, handlePaste, editing, elementSelector]);
}
