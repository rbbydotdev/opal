import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWindowContextProvider } from "@/features/live-preview/IframeContextProvider";
import { WindowPreviewComponent, WindowPreviewHandler } from "@/features/live-preview/PreviewComponent";
import { useResolvePathForPreview } from "@/features/live-preview/useResolvePathForPreview.js";
import { useSidebarPanes } from "@/layouts/EditorSidebarLayout.jsx";
import { useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { ExternalLink, Printer, X, Zap } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

function printOnRenderBodyReady(
  el: HTMLElement,
  context: {
    document: Document;
    window: Window;
    ready: true;
  }
) {
  // Show overlay immediately

  const script = context.document.createElement("script");
  script.textContent = /* javascript */ `
    
    // Hide overlay when print dialog closes
    window.addEventListener('afterprint', () => {
      window.opener?.postMessage({ type: 'hidePrintOverlay' }, '*');
    });
    
    if (document.querySelector("#render-body")?.children.length > 0){
       window.opener?.postMessage({ type: 'showPrintOverlay' }, '*')
       setTimeout(()=>window.print(), 0);
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
  const [printOverlayRequested, setPrintOverlayRequested] = useState(false);

  const { isOpen } = useWindowContextProvider();

  // Derive overlay state reactively - only show if requested AND window is open
  const showPrintOverlay = printOverlayRequested && isOpen;

  const onRenderBodyReadyRef =
    useRef<(el: HTMLElement, context: { document: Document; window: Window; ready: true }) => void | null>(null);

  // Using ref to do an conditional on imperitive function execution
  useLayoutEffect(() => {
    if (!isOpen) onRenderBodyReadyRef.current = null;
  }, [isOpen]);
  useEffect(() => {
    onRenderBodyReadyRef.current = null;
  }, []);

  // Handle print overlay events
  useEffect(() => {
    const handleOverlayMessage = (event: MessageEvent) => {
      if (event.data?.type === "showPrintOverlay") {
        setPrintOverlayRequested(true);
      } else if (event.data?.type === "hidePrintOverlay") {
        setPrintOverlayRequested(false);
      }
    };

    window.addEventListener("showPrintOverlay", () => setPrintOverlayRequested(true));
    window.addEventListener("message", handleOverlayMessage);

    return () => {
      window.removeEventListener("showPrintOverlay", () => setPrintOverlayRequested(true));
      window.removeEventListener("message", handleOverlayMessage);
    };
  }, []);
  function handlePrintClick() {
    if (!isOpen) {
      onRenderBodyReadyRef.current = printOnRenderBodyReady;
      extPreviewCtrl.current?.open();
      return () => (onRenderBodyReadyRef.current = null);
    }
  }
  // --------

  if (!previewNode) return null;

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
              Print <Printer className="stroke-background flex-shrink !w-4 !h-4" />
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

// <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 backdrop-blur-sm">
//   <Card className="bg-card rounded-lg p-6 max-w-md mx-4 shadow-2xl">
//     <CardHeader>
//       <Printer className="mx-auto mb-4 w-12 h-12 text-primary" />
//       <h3 className="text-lg font-semibold mb-2">Print Dialog Open</h3>
//     </CardHeader>
//     <CardContent className="text-center">
//       <p className="mb-4">Close the print dialog in the preview window to continue using the editor.</p>
//     </CardContent>
//   </Card>
// </div>,
