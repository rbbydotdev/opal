import { useLiveCssFiles } from "@/editor/useLiveCssFiles";
import { useIframeContextProvider, useWindowContextProvider } from "@/features/live-preview/IframeContextProvider";
import { PreviewContent } from "@/features/live-preview/PreviewContent";
import { useResolvePathForPreview } from "@/features/live-preview/useResolvePathForPreview";
import { ScrollSync } from "@/features/live-preview/useScrollSync";
import { BrowserDetection } from "@/lib/BrowserDetection";
import { AbsPath, prefix, relPath } from "@/lib/paths2";
import { Workspace } from "@/workspace/Workspace";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { injectCssFiles } from "./injectCssFiles";

function getScrollElement(context: any, renderBodyElement: HTMLElement | null): HTMLElement | null {
  if (BrowserDetection.isFirefox()) {
    return context.document?.documentElement || context.document?.body || null;
  }

  return renderBodyElement || context.document?.documentElement || context.document?.body || null;
}

function getListenElement(context: any, renderBodyElement: HTMLElement | null): HTMLElement | Window | null {
  if (BrowserDetection.isFirefox()) return context.window as any;
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
              mode="pane"
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
  {
    path: AbsPath;
    currentWorkspace: Workspace;
    children?: React.ReactNode;
    onRenderBodyReady?: (
      element: HTMLElement,
      context: {
        document: Document;
        window: Window;
        ready: true;
      }
    ) => void;
  }
>(function WindowPreviewComponent({ path, currentWorkspace, children, onRenderBodyReady }, ref) {
  const { open, close, isOpen, ...context } = useWindowContextProvider();
  const { pathPreviewNode } = useResolvePathForPreview({ path, currentWorkspace });
  const resolvedPath = pathPreviewNode?.path || path;

  const cssFiles = useLiveCssFiles({
    path: resolvedPath,
    currentWorkspace,
  });

  useEffect(() => {
    if (context.document == null) return;
    context.document.title = prefix(resolvedPath);
  }, [context.document, resolvedPath]);

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
            <PreviewContent
              mode="external"
              path={resolvedPath}
              currentWorkspace={currentWorkspace}
              onRenderBodyReady={(el) => onRenderBodyReady?.(el, context)}
              context={context}
            />,
            context.document.body
          )}

      {children}
    </>
  );
});
