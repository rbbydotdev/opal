import { useLivePreviewDialog } from "@/components/LivePreviewProvider";
import { useWindowContextProvider } from "@/features/live-preview/IframeContextProvider";
import { printOnRenderBodyReady } from "@/features/live-preview/printOnRenderBodyReady";
import { useResolvePathForPreview } from "@/features/live-preview/useResolvePathForPreview.js";
import { useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { useEffect, useState } from "react";

export function useLivePreview() {
  const { path } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();
  const { pathPreviewNode: previewNode } = useResolvePathForPreview({ path, currentWorkspace });
  const [overlayRequested, setOverlayRequested] = useState(false);
  const { isOpen } = useWindowContextProvider();
  const { showDialog, extPreviewCtrl, onRenderBodyReadyRef } = useLivePreviewDialog();
  const showPrintOverlay = overlayRequested && isOpen;

  useEffect(() => {
    showDialog(showPrintOverlay);
    if (showPrintOverlay) {
      return () => {
        onRenderBodyReadyRef.current = null;
      };
    }
  }, [showPrintOverlay, showDialog, onRenderBodyReadyRef]);

  function handlePrintClick() {
    if (!isOpen) {
      onRenderBodyReadyRef.current = printOnRenderBodyReady;
      setOverlayRequested(true);
      extPreviewCtrl.current?.open();
      const handleOverlayMessage = (event: MessageEvent) => {
        if (event.data?.type === "hidePrintOverlay") {
          setOverlayRequested(false);
        }
      };
      window.addEventListener("message", handleOverlayMessage, {
        once: true,
      });
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
    isOpen,

    // Refs for components
    extPreviewCtrl,

    // Actions
    handlePrintClick,
    openPreview,
    closePreview,
  };
}
