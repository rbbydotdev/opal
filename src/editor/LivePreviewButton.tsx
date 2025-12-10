import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWindowContextProvider } from "@/features/live-preview/IframeContextProvider";
import { WindowPreviewComponent, WindowPreviewHandler } from "@/features/live-preview/PreviewComponent";
import { useResolvePathForPreview } from "@/features/live-preview/useResolvePathForPreview.js";
import { useSidebarPanes } from "@/layouts/EditorSidebarLayout.jsx";
import { useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { ExternalLink, Printer, X, Zap } from "lucide-react";
import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";

function printOnRenderBodyReady(
  el: HTMLElement,
  context: {
    document: Document;
    window: Window;
    ready: true;
  }
) {
  const script = context.document.createElement("script");
  script.textContent = /* javascript */ `
    window.addEventListener('afterprint', () => {
      window.opener?.postMessage({ type: 'hidePrintOverlay' }, '*');
    });
    if (document.querySelector("#render-body")?.children.length > 0){
       setTimeout(()=>window.print(),0);
    }
  `;
  el.appendChild(script);
}
export function LivePreviewButtons() {
  const { right } = useSidebarPanes();
  const { path } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();
  const { previewNode } = useResolvePathForPreview({ path, currentWorkspace });
  const extPreviewCtrl = useRef<WindowPreviewHandler>(null);
  const overlayRequestedRef = useRef(false);
  const { isOpen } = useWindowContextProvider();
  const showPrintOverlay = overlayRequestedRef.current && isOpen;

  const onRenderBodyReadyRef =
    useRef<(el: HTMLElement, context: { document: Document; window: Window; ready: true }) => void | null>(null);

  useEffect(() => {
    if (showPrintOverlay) {
      return () => {
        onRenderBodyReadyRef.current = null;
      };
    }
  }, [isOpen, overlayRequestedRef, showPrintOverlay]);
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
  if (!previewNode) return null;
  if (overlayRequestedRef.current) {
    //when print is not locking(firefox) this will close it immediately
    //it will also prevent it opening when its not needed
    setTimeout(() => {
      flushSync(() => {
        overlayRequestedRef.current = false;
      });
    }, 0);
  }
  return (
    <>
      <div className={"flex items-center justify-center flex-nowrap"}>
        <Button size="sm" className="rounded-r-none" onClick={() => right.setIsCollapsed((prev) => !prev)} asChild>
          <div>
            {right.isCollapsed ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-full flex justify-center items-center border-1 ">Open Preview</div>
                <Zap size={36} className="!w-5 !h-5 stroke-primary-foreground" strokeWidth={2} />
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <X size={36} className="!w-5 !h-5 stroke-primary-foreground" strokeWidth={2} />
                Close Preview
              </div>
            )}
          </div>
        </Button>

        <WindowPreviewComponent
          path={path!}
          ref={extPreviewCtrl}
          currentWorkspace={currentWorkspace}
          onRenderBodyReady={onRenderBodyReadyRef.current!}
        >
          <>
            <Button size="sm" className="rounded-l-none rounded-r-none" onClick={handlePrintClick}>
              Print <Printer className="stroke-primary-foreground flex-shrink !w-4 !h-4" />
            </Button>
            {!isOpen ? (
              <Button
                size="sm"
                className={"text-secondary rounded-l-none border-l-border"}
                onClick={extPreviewCtrl.current?.open}
                asChild
              >
                <span>
                  <ExternalLink size={32} className="!text-primary-foreground  !w-5 !h-5" strokeWidth={1} />
                </span>
              </Button>
            ) : (
              <Button
                size="sm"
                className={"active:scale-95 text-secondary rounded-l-none border-l-border"}
                onClick={extPreviewCtrl.current?.close}
                asChild
              >
                <span>
                  <X size={32} className="!text-primary-foreground  !w-5 !h-5" strokeWidth={1} />
                </span>
              </Button>
            )}
          </>
        </WindowPreviewComponent>
      </div>
      <Dialog open={showPrintOverlay}>
        <DialogContent>
          <DialogTitle className="sr-only">Print Dialog Open</DialogTitle>
          <DialogHeader className="flex justify-center items-center">
            <Printer className="mx-auto mb-4 w-12 h-12 text-primary" />
            <h3 className="text-lg font-semibold mb-2">Print Dialog Open</h3>
          </DialogHeader>
          <div className="text-center">
            <p className="mb-4">Close the print dialog in the preview window to continue using the editor.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
