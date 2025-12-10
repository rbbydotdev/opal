import { useLivePreviewDialog } from "@/components/LivePreviewDialogProvider";
import { useWindowContextProvider } from "@/features/live-preview/IframeContextProvider";
import { WindowPreviewHandler } from "@/features/live-preview/PreviewComponent";
import { printOnRenderBodyReady } from "@/features/live-preview/printOnRenderBodyReady";
import { useResolvePathForPreview } from "@/features/live-preview/useResolvePathForPreview.js";
import { useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";

export function useLivePreview() {
  const { path } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();
  const { previewNode } = useResolvePathForPreview({ path, currentWorkspace });
  const extPreviewCtrl = useRef<WindowPreviewHandler>(null);
  const overlayRequestedRef = useRef(false);
  const { isOpen } = useWindowContextProvider();
  const { showDialog } = useLivePreviewDialog();
  const showPrintOverlay = overlayRequestedRef.current && isOpen;

  const onRenderBodyReadyRef =
    useRef<(el: HTMLElement, context: { document: Document; window: Window; ready: true }) => void | null>(null);

  useEffect(() => {
    showDialog(showPrintOverlay);
    if (showPrintOverlay) {
      return () => {
        onRenderBodyReadyRef.current = null;
      };
    }
  }, [showPrintOverlay, showDialog]);

  useEffect(() => {
    if (overlayRequestedRef.current) {
      //when print is not locking(firefox) this will close it immediately
      //it will also prevent it opening when its not needed
      setTimeout(() => {
        flushSync(() => {
          overlayRequestedRef.current = false;
        });
      }, 0);
    }
  });

  function handlePrintClick() {
    if (!isOpen) {
      onRenderBodyReadyRef.current = printOnRenderBodyReady;
      overlayRequestedRef.current = true;
      extPreviewCtrl.current?.open();
      const handleOverlayMessage = (event: MessageEvent) => {
        if (event.data?.type === "hidePrintOverlay") {
          overlayRequestedRef.current = false;
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
    onRenderBodyReadyRef,

    // Actions
    handlePrintClick,
    openPreview,
    closePreview,
  };
}
