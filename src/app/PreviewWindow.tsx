import { useWorkspaceContext, useWorkspaceRoute } from "@/context/WorkspaceContext";
import { useResolvePathForPreview } from "@/features/preview-pane/useResolvePathForPreview";
import { getScrollEmitter, releaseScrollEmitter, scrollEmitterSession } from "@/hooks/useScrollSyncForEditor";
import { useEffect } from "react";
import { usePreviewLogic } from "./PreviewCore";
import { useWindowContextProvider } from "./WindowContextProvider";

export function PreviewWindow() {
  const { path } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();

  // Resolve path for preview (handles CSS-to-markdown navigation)
  const previewNode = useResolvePathForPreview({ path, currentWorkspace });
  const actualPath = previewNode?.path || path;

  // Create session ID from workspace + path for scroll sync (add :window suffix to avoid conflicts)
  const sessionId = scrollEmitterSession({ workspaceId: currentWorkspace.id, path }, "window");

  // Get or create scroll sync emitter for this session
  const scrollEmitter = getScrollEmitter(sessionId);

  // Setup window context
  const { contextProvider, isWindowOpen, openWindow, closeWindow } = useWindowContextProvider();

  // Use shared preview logic
  usePreviewLogic({ contextProvider, path: actualPath, currentWorkspace, scrollEmitter });

  // Cleanup scroll emitter on unmount
  useEffect(() => {
    return () => {
      if (sessionId) {
        releaseScrollEmitter(sessionId);
      }
    };
  }, [sessionId]);

  const handleOpenWindow = () => {
    const success = openWindow();
    if (!success) {
      alert("Popup blocked! Please allow popups for this site.");
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Preview Window</h3>
        <p className="text-sm text-muted-foreground">Open preview in a separate window for side-by-side editing</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleOpenWindow}
          disabled={isWindowOpen}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isWindowOpen ? "Window Open" : "Open Preview Window"}
        </button>

        {isWindowOpen && (
          <button
            onClick={closeWindow}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
          >
            Close Window
          </button>
        )}
      </div>

      {actualPath && <div className="text-sm text-muted-foreground">Preview: {actualPath}</div>}
    </div>
  );
}
