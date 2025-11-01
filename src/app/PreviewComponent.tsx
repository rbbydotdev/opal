import { useIframeContextProvider } from "@/app/IframeContextProvider";
import { injectCssFiles, PreviewContent } from "@/app/PreviewContent";
import { useLiveCssFiles } from "@/components/Editor/useLiveCssFiles";
import { Workspace } from "@/data/Workspace";
import { AbsPath } from "@/lib/paths2";
import { useEffect, useRef } from "react";
// import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";

export function PreviewComponent({ path, currentWorkspace }: { path: AbsPath; currentWorkspace: Workspace }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const context = useIframeContextProvider({
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
        <iframe ref={iframeRef} className="w-full h-full border-0 bg-white" title="Preview" />
      </div>
    </>
  );
}
