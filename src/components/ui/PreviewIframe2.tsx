import { relPath } from "@/lib/paths2";
import { ExternalLink, Loader, RefreshCw } from "lucide-react";
import { useRef, useState } from "react";
import { PreviewComponent2 } from "@/app/PreviewComponent2";
import { useWindowContextProvider } from "@/app/WindowContextProvider";
import { useWorkspaceContext, useWorkspaceRoute } from "@/context/WorkspaceContext";
import { useResolvePathForPreview } from "@/features/preview-pane/useResolvePathForPreview";
import { usePreviewLogic, PreviewContextProvider } from "@/app/PreviewCore";
import { getScrollEmitter, releaseScrollEmitter } from "@/app/PreviewComponent2";
import { useEffect } from "react";

export function PreviewIFrame2({ previewPath }: { previewPath?: string | null }) {
  const [showSpinner, setShowSpinner] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Window preview functionality
  const { path } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();
  const previewNode = useResolvePathForPreview({ path, currentWorkspace });
  const actualPath = previewNode?.path || path;

  // Create session ID for window (separate from iframe)
  const sessionId = currentWorkspace && actualPath 
    ? `${currentWorkspace.name}:${actualPath}:window`
    : undefined;

  // Window context for popup preview
  const { contextProvider, isWindowOpen, openWindow, closeWindow } = useWindowContextProvider(
    currentWorkspace?.name, 
    sessionId
  );

  const scrollEmitter = sessionId ? getScrollEmitter(sessionId) : undefined;

  // Use shared preview logic for window (only when window is open)
  useEffect(() => {
    if (isWindowOpen) {
      // Force re-render of preview logic when window opens
      // The usePreviewLogic hook will check contextProvider.isReady()
    }
  }, [isWindowOpen]);

  // Only run preview logic when window is actually open
  usePreviewLogic(
    isWindowOpen ? contextProvider : { 
      isReady: () => false, 
      getContext: () => null, 
      cleanup: () => {} 
    } as PreviewContextProvider, 
    actualPath, 
    currentWorkspace, 
    scrollEmitter
  );

  // Cleanup scroll emitter on unmount
  useEffect(() => {
    return () => {
      if (sessionId) {
        releaseScrollEmitter(sessionId);
      }
    };
  }, [sessionId]);

  const handleRefresh = () => {
    setShowSpinner(true);
    setRefreshKey(prev => prev + 1);
    // Spinner will be hidden when content finishes loading
  };

  const handleOpenWindow = () => {
    const success = openWindow();
    if (!success) {
      alert('Popup blocked! Please allow popups for this site.');
    }
  };

  return (
    <div className="h-full w-full relative flex flex-col">
      <div className="w-full h-12 bg-sidebar z-10 flex items-center text-sm py-2 font-bold px-4">
        <button
          onClick={handleRefresh}
          className="flex items-center justify-center w-8 h-8 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          title="Refresh preview"
        >
          <RefreshCw size={16} />
        </button>
        <div className="flex items-center gap-2 truncate flex-1 justify-center">
          <span className="font-light font-mono before:content-['['] after:content-[']']">PREVIEW2</span>
          {" / "}
          <span className="truncate font-mono">{relPath(previewPath!)}</span>
        </div>
        <button
          onClick={handleOpenWindow}
          className="flex items-center justify-center w-8 h-8 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          title="Open preview in new window"
        >
          <ExternalLink size={16} />
        </button>
      </div>
      
      {showSpinner && (
        <div className="w-full h-full flex m-auto inset-0 absolute justify-center items-center bg-background">
          <div className="animate-spin animation-iteration-infinite">
            <Loader size={24} />
          </div>
        </div>
      )}

      <div key={refreshKey} className="flex-grow relative">
        <PreviewComponent2 onContentLoaded={() => setShowSpinner(false)} />
      </div>
    </div>
  );
}