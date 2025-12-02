import { useIframeContextProvider, useWindowContextProvider } from "@/app/IframeContextProvider";
import { injectCssFiles, PreviewContent } from "@/app/PreviewContent";
import { useLiveCssFiles } from "@/components/Editor/useLiveCssFiles";
import { Workspace } from "@/data/Workspace";
import { useResolvePathForPreview } from "@/features/preview-pane/useResolvePathForPreview";
import { AbsPath, relPath } from "@/lib/paths2";
import { ScrollSync } from "@/lib/useScrollSync";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
// import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";

function getScrollElement(context: any, renderBodyElement: HTMLElement | null): HTMLElement | null {
  const isFirefox = navigator.userAgent.includes("Firefox");

  if (isFirefox) {
    return context.document?.documentElement || context.document?.body || null;
  }

  return renderBodyElement || context.document?.documentElement || context.document?.body || null;
}

function getListenElement(context: any, renderBodyElement: HTMLElement | null): HTMLElement | Window | null {
  const isFirefox = navigator.userAgent.includes("Firefox");

  if (isFirefox) {
    return context.window as any;
  }

  return renderBodyElement || (context.window as any);
}

export function PreviewComponent({ path, currentWorkspace }: { path: AbsPath; currentWorkspace: Workspace }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [renderBodyElement, setRenderBodyElement] = useState<HTMLElement | null>(null);
  const context = useIframeContextProvider({
    workspaceName: currentWorkspace.name,
    iframeRef,
  });

  const cssFiles = useLiveCssFiles({
    path,
    currentWorkspace,
  });

  useEffect(() => {
    if (!context.ready) return;
    injectCssFiles(context, cssFiles);
  }, [context, cssFiles]);

  return (
    <>
      {!context?.document?.body
        ? null
        : createPortal(
            <PreviewContent
              path={path}
              currentWorkspace={currentWorkspace}
              context={context}
              onRenderBodyReady={(element) => {
                setRenderBodyElement(element);
              }}
            />,
            context.document.body
          )}
      <div className="w-full h-full relative">
        <ScrollSync
          path={path}
          workspaceName={currentWorkspace.name}
          elementRef={{
            current: getScrollElement(context, renderBodyElement),
          }}
          listenRef={{
            current: getListenElement(context, renderBodyElement) as any,
          }}
        >
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0 bg-white"
            title={`${currentWorkspace.name} ${relPath(path)}`}
          />
        </ScrollSync>
      </div>
    </>
  );
}

export interface WindowPreviewHandler {
  open(): void;
  close(): void;
}

export const WindowPreviewComponent = forwardRef<
  WindowPreviewHandler,
  { path: AbsPath; currentWorkspace: Workspace; Open?: React.ReactNode; Closed?: React.ReactNode }
>(function WindowPreviewComponent({ path, currentWorkspace, Open, Closed }, ref) {
  const { open, close, isOpen, ...context } = useWindowContextProvider();
  const { previewNode } = useResolvePathForPreview({ path, currentWorkspace });
  const resolvedPath = previewNode?.path || path;

  const cssFiles = useLiveCssFiles({
    path: resolvedPath,
    currentWorkspace,
  });

  useEffect(() => {
    if (!context.ready) return;
    injectCssFiles(context, cssFiles);
  }, [context, cssFiles]);

  useImperativeHandle(
    ref,
    () => ({
      open,
      close,
    }),
    [close, open]
  );

  return (
    <>
      {!context?.document?.body
        ? null
        : createPortal(
            <PreviewContent path={resolvedPath} currentWorkspace={currentWorkspace} context={context} />,
            context.document.body
          )}

      {isOpen ? (Open ?? null) : (Closed ?? null)}
    </>
  );
});
