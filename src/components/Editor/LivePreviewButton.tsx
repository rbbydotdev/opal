import { Button } from "@/components/ui/button";
import { useWorkspaceContext, useWorkspaceRoute } from "@/context/WorkspaceContext";
import { useSidebarPanes } from "@/features/preview-pane/EditorSidebarLayout.jsx";
import { useResolvePathForPreview } from "@/features/preview-pane/useResolvePathForPreview.js";
import { releaseScrollEmitter, scrollEmitterSession } from "@/hooks/useScrollSyncForEditor";
import { X, Zap } from "lucide-react";
import { useEffect } from "react";

export function LivePreviewButtons() {
  const { right } = useSidebarPanes();
  const { path } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();
  const previewNode = useResolvePathForPreview({ path, currentWorkspace });
  // const actualPath = previewNode?.path || path;

  // Create session ID for window (separate from iframe)
  const sessionId = scrollEmitterSession({ workspaceId: currentWorkspace.id, path }, "window");
  // Window context for popup preview
  // const { contextProvider, isWindowOpen, openWindow } = useWindowContextProvider(currentWorkspace?.name, sessionId);

  // const scrollEmitter = getScrollEmitter(sessionId);

  // Use shared preview logic for window (only when window is open)
  // usePreviewLogic({
  //   contextProvider,
  //   path: actualPath,
  //   currentWorkspace,
  //   scrollEmitter,
  // });

  // Cleanup scroll emitter on unmount
  useEffect(() => {
    return () => {
      if (sessionId) {
        releaseScrollEmitter(sessionId);
      }
    };
  }, [sessionId]);

  // const handleOpenWindow = () => {
  //   const success = openWindow();
  //   if (!success) {
  //     alert("Popup blocked! Please allow popups for this site.");
  //   }
  // };

  if (!previewNode) return null;
  return (
    <div className={"flex  items-center justify-center flex-nowrap "}>
      <Button
        size="sm"
        className="active:scale-95 rounded-r-none"
        onClick={() => right.setIsCollapsed((prev) => !prev)}
        asChild
      >
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
      {/* <Button
        size="sm"
        className={"active:scale-95 text-secondary rounded-l-none border-l-border"}
        onClick={handleOpenWindow}
      >
        <span>
          <ExternalLink size={32} className="!text-primary-foreground  !w-5 !h-5" strokeWidth={1} />
        </span>
      </Button> */}
    </div>
  );
}
