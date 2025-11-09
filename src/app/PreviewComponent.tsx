import { useIframeContextProvider, useWindowContextProvider } from "@/app/IframeContextProvider";
import { injectCssFiles, PreviewContent } from "@/app/PreviewContent";
import { useLiveCssFiles } from "@/components/Editor/useLiveCssFiles";
import { Workspace } from "@/data/Workspace";
import { useResolvePathForPreview } from "@/features/preview-pane/useResolvePathForPreview";
import { AbsPath, relPath } from "@/lib/paths2";
import { ScrollSync } from "@/lib/useScrollSync";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
// import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";

export function PreviewComponent({ path, currentWorkspace }: { path: AbsPath; currentWorkspace: Workspace }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
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
            <PreviewContent path={path} currentWorkspace={currentWorkspace} context={context} />,
            context.document.body
          )}
      <div className="w-full h-full relative">
        <ScrollSync
          path={path}
          workspaceName={currentWorkspace.name}
          elementRef={{ current: context.document?.documentElement || context.document?.body || null }}
          listenRef={{
            current: context.window as any,
          }}
        >
          <iframe
            ref={iframeRef}
            // sandbox="allow-same-origin"
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
