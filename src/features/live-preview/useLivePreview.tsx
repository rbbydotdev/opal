import { useLivePreviewDialog } from "@/components/LivePreviewProvider";
import { useWindowContextProvider } from "@/features/live-preview/IframeContextProvider";
import { useResolvePathForPreview } from "@/features/live-preview/useResolvePathForPreview.js";
import { useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";

export function useLivePreview() {
  const { path } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();
  const { pathPreviewNode: previewNode } = useResolvePathForPreview({ path, currentWorkspace });
  const context = useWindowContextProvider();
  const { showDialog, extPreviewCtrl } = useLivePreviewDialog();

  function handlePrintClick() {
    if (!context.isOpen) {
      showDialog(true);
      extPreviewCtrl.current?.open({ print: true });
    }
  }

  function openPreview() {
    extPreviewCtrl.current?.open();
  }

  function closePreview() {
    extPreviewCtrl.current?.close();
  }

  return {
    // State
    previewNode,
    isOpen: context.isOpen,

    // Refs for components
    extPreviewCtrl,

    // Actions
    handlePrintClick,
    openPreview,
    closePreview,
  };
}
