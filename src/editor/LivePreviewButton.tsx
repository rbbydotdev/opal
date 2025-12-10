import { Button } from "@/components/ui/button";
import { useWindowContextProvider } from "@/features/live-preview/IframeContextProvider";
import { WindowPreviewComponent, WindowPreviewHandler } from "@/features/live-preview/PreviewComponent";
import { useResolvePathForPreview } from "@/features/live-preview/useResolvePathForPreview.js";
import { useSidebarPanes } from "@/layouts/EditorSidebarLayout.jsx";
import { useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { ExternalLink, Printer, X, Zap } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";

function printOnRenderBodyReady(
  el: HTMLElement,
  context: {
    document: Document;
    window: Window;
    ready: true;
  }
) {
  // Show overlay in main window and flush immediately
  flushSync(() => {
    window.dispatchEvent(new CustomEvent("showPrintOverlay"));
  });

  // Now execute print - overlay is guaranteed to be rendered
  const script = context.document.createElement("script");
  script.textContent = `
    window.print();
    // Hide overlay when print dialog closes
    window.addEventListener('afterprint', () => {
      window.opener?.postMessage({ type: 'hidePrintOverlay' }, '*');
    });
  `;
  el.appendChild(script);
}
export function LivePreviewButtons() {
  const { right } = useSidebarPanes();
  const { path } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();
  const { previewNode } = useResolvePathForPreview({ path, currentWorkspace });
  const extPreviewCtrl = useRef<WindowPreviewHandler>(null);
  const [showPrintOverlay, setShowPrintOverlay] = useState(false);

  const { isOpen } = useWindowContextProvider();

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
    let threadMonitor: number | null = null;

    const handleShowOverlay = () => {
      setShowPrintOverlay(true);

      // Start monitoring main thread to detect when print dialog closes
      let lastTime = Date.now();
      const checkThreadUnlock = () => {
        const currentTime = Date.now();
        const timeDiff = currentTime - lastTime;

        // If more than 200ms has passed since last check,
        // main thread was likely blocked by print dialog
        if (timeDiff > 200) {
          // Thread is now unblocked - print dialog likely closed
          setShowPrintOverlay(false);
          if (threadMonitor) {
            cancelAnimationFrame(threadMonitor);
            threadMonitor = null;
          }
          return;
        }

        lastTime = currentTime;
        threadMonitor = requestAnimationFrame(checkThreadUnlock);
      };

      threadMonitor = requestAnimationFrame(checkThreadUnlock);
    };

    const handleHideOverlay = (event: MessageEvent) => {
      if (event.data?.type === "hidePrintOverlay") {
        setShowPrintOverlay(false);
        if (threadMonitor) {
          cancelAnimationFrame(threadMonitor);
          threadMonitor = null;
        }
      }
    };

    window.addEventListener("showPrintOverlay", handleShowOverlay);
    window.addEventListener("message", handleHideOverlay);

    return () => {
      window.removeEventListener("showPrintOverlay", handleShowOverlay);
      window.removeEventListener("message", handleHideOverlay);
      if (threadMonitor) {
        cancelAnimationFrame(threadMonitor);
      }
    };
  }, []);
  function handlePrintClick() {
    if (!isOpen) {
      onRenderBodyReadyRef.current = printOnRenderBodyReady;
      extPreviewCtrl.current?.open();
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
      {showPrintOverlay &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-2xl">
              <div className="text-center">
                <Printer className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">Print Dialog Open</h3>
                <p className="text-gray-600 mb-4">
                  Close the print dialog in the preview window to continue using the editor.
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
