import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { MetaDataTransfer } from "@/components/MetaDataTransfer";
import { useFileMenuPaste } from "@/components/SidebarFileMenu/hooks/useFileMenuPaste";
import { toast } from "@/components/ui/sonner";
import { Workspace } from "@/Db/Workspace";
import { copyFileNodesToClipboard } from "@/features/filetree-copy-paste/copyFileNodesToClipboard";
import { useEffect } from "react";

const files = (count: number) => (count > 1 ? "files" : "file");

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
        const dataTransfer = new MetaDataTransfer(event.clipboardData!);
        const resultCount = await handlePaste({ targetNode, data: dataTransfer });

        toast({
          title: "Files",
          description: `Pasted ${resultCount} ${files(resultCount)} from clipboard.`,
          type: "info",
          position: "top-right",
        });
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

      toast({
        title: "Files",
        description: `Cut ${selectedFocused.length} ${files(selectedFocused.length)} to clipboard.`,
        type: "info",
        position: "top-right",
      });
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
        toast({
          title: "Files",
          description: `Copied ${selectedFocused.length} ${files(selectedFocused.length)} to clipboard.`,
          type: "info",
          position: "top-right",
        });
        return copyFileNodesToClipboard({
          fileNodes: currentWorkspace.nodesFromPaths(selectedFocused),
          action: "copy",
          workspaceId: currentWorkspace.id,
        });
      }
    };
    //should i just listen on "[data-sidebar-file-menu] ???
    const sidebarElement = document.querySelector(elementSelector) as HTMLElement | null;
    if (!sidebarElement) return;
    sidebarElement.addEventListener("paste", handlePasteEvent);
    sidebarElement.addEventListener("cut", handleCutEvent);
    sidebarElement.addEventListener("copy", handleCopyEvent);
    return () => {
      sidebarElement.removeEventListener("paste", handlePasteEvent);
      sidebarElement.removeEventListener("cut", handleCutEvent);
      sidebarElement.removeEventListener("copy", handleCopyEvent);
    };
  }, [currentWorkspace, focused, selectedFocused, setFileTreeCtx, handlePaste, editing, elementSelector]);
}
