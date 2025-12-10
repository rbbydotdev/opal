import { Button } from "@/components/ui/button";
import { useWindowContextProvider } from "@/features/live-preview/IframeContextProvider";
import { WindowPreviewComponent, WindowPreviewHandler } from "@/features/live-preview/PreviewComponent";
import { useResolvePathForPreview } from "@/features/live-preview/useResolvePathForPreview.js";
import { useSidebarPanes } from "@/layouts/EditorSidebarLayout.jsx";
import { useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { ExternalLink, Printer, X, Zap } from "lucide-react";
import { useEffect, useLayoutEffect, useRef } from "react";

function printOnRenderBodyReady(
  el: HTMLElement,
  context: {
    document: Document;
    window: Window;
    ready: true;
  }
) {
  const script = context.document.createElement("script");
  script.textContent = "window.print()";
  el.appendChild(script);
}
export function LivePreviewButtons() {
  const { right } = useSidebarPanes();
  const { path } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();
  const { previewNode } = useResolvePathForPreview({ path, currentWorkspace });
  const extPreviewCtrl = useRef<WindowPreviewHandler>(null);

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
    </>
  );
}
