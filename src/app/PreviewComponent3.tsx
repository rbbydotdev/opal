import { useIframeContextProvider } from "@/app/IframeContextProvider";
import { injectCssFiles, PreviewContent } from "@/app/PreviewCore";
import { useLiveCssFiles } from "@/components/Editor/useLiveCssFiles";
import { Workspace } from "@/data/Workspace";
import { AbsPath } from "@/lib/paths2";
import { useEffect, useRef } from "react";
import { Root } from "react-dom/client";
// import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";

export function PreviewComponent3({
  path,
  currentWorkspace,
  onContentLoaded,
}: {
  path: AbsPath;
  currentWorkspace: Workspace;
  onContentLoaded?: () => void;
}) {
  const { iframeRef, contextProvider } = useIframeContextProvider();
  const reactRootRef = useRef<Root | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reactRootRef.current) {
        try {
          reactRootRef.current.unmount();
        } catch (error) {
          console.warn("Error unmounting React root on cleanup:", error);
        }
        reactRootRef.current = null;
      }
    };
  }, []);
  const cssFiles = useLiveCssFiles({
    path,
    currentWorkspace,
  });

  useEffect(() => {
    if (!contextProvider.isReady()) return;

    const context = contextProvider.getContext();
    if (context) {
      injectCssFiles(context, cssFiles);
    }
  }, [contextProvider, cssFiles]);

  const context = contextProvider.getContext();
  return (
    <>
      {!context?.document?.body
        ? null
        : createPortal(
            <PreviewContent
              path={path}
              currentWorkspace={currentWorkspace}
              context={context}
              onContentLoaded={onContentLoaded}
            />,
            context.document.body
          )}
      <div className="w-full h-full relative">
        <iframe ref={iframeRef} className="w-full h-full border-0 bg-white" title="Preview" />
      </div>
    </>
  );
}
