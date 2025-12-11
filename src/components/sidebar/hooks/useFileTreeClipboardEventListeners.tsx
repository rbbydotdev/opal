import { useFileTreeMenuCtx } from "@/components/filetree/FileTreeMenuContext";
import { MetaDataTransfer } from "@/components/MetaDataTransfer";
import { useFileMenuPaste } from "@/components/sidebar/hooks/useFileMenuPaste";
import { toast } from "@/components/ui/sonner";
import { copyFileNodesToClipboard } from "@/features/filetree-copy-paste/copyFileNodesToClipboard";
import { Workspace } from "@/workspace/Workspace";
import { useEffect, useEffectEvent, useRef } from "react";

const files = (count: number) => (count > 1 ? "files" : "file");

export function useFileTreeClipboardEventListeners({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const { editing, selectedFocused, setFileTreeCtx } = useFileTreeMenuCtx();

  const handlePaste = useFileMenuPaste({ currentWorkspace });
  const sidebarRef = useRef<HTMLElement | null>(null);

  // --- Effect Events ---
  const handlePasteEvent = useEffectEvent(async (event: ClipboardEvent) => {
    const sidebarElement = sidebarRef.current;
    const target = event.target as HTMLElement | null;

    if (!sidebarElement?.contains(target) || editing) return;

    const targetNode = currentWorkspace.tryNodeFromPath(selectedFocused[0]!);
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
  });

  const handleCutEvent = useEffectEvent((event: ClipboardEvent) => {
    const sidebarElement = sidebarRef.current;
    const target = window.document.activeElement || (event.target as HTMLElement | null);

    if (!sidebarElement?.contains(target) || editing) return;

    toast({
      title: "Files",
      description: `Cut ${selectedFocused.length} ${files(selectedFocused.length)} to clipboard.`,
      type: "info",
      position: "top-right",
    });

    void copyFileNodesToClipboard({
      fileNodes: currentWorkspace.nodesFromPaths(selectedFocused),
      action: "cut",
      workspaceId: currentWorkspace.id,
    });
  });

  const handleCopyEvent = useEffectEvent((event: ClipboardEvent) => {
    const sidebarElement = sidebarRef.current;
    const target = window.document.activeElement || (event.target as HTMLElement | null);

    if (!sidebarElement?.contains(target) || editing) return;

    toast({
      title: "Files",
      description: `Copied ${selectedFocused.length} ${files(selectedFocused.length)} to clipboard.`,
      type: "info",
      position: "top-right",
    });

    void copyFileNodesToClipboard({
      fileNodes: currentWorkspace.nodesFromPaths(selectedFocused),
      action: "copy",
      workspaceId: currentWorkspace.id,
    });
  });

  // --- Effect for event listener registration ---
  useEffect(() => {
    window.addEventListener("paste", handlePasteEvent);
    window.addEventListener("cut", handleCutEvent);
    window.addEventListener("copy", handleCopyEvent);
    return () => {
      window.removeEventListener("paste", handlePasteEvent);
      window.removeEventListener("cut", handleCutEvent);
      window.removeEventListener("copy", handleCopyEvent);
    };
  }, [handlePasteEvent, handleCutEvent, handleCopyEvent]);

  return { ref: sidebarRef };
}
