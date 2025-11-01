import { useWorkspaceContext, useWorkspaceRoute } from "@/context/WorkspaceContext";
import { useResolvePathForPreview } from "@/features/preview-pane/useResolvePathForPreview";
import { getScrollEmitter, scrollEmitterSession } from "@/hooks/useScrollSyncForEditor";
import { useIframeContextProvider } from "./IframeContextProvider";
import { usePreviewLogic } from "./PreviewCore";

export function PreviewComponent2({ onContentLoaded }: { onContentLoaded?: () => void } = {}) {
  const { path } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();

  // Resolve path for preview (handles CSS-to-markdown navigation)
  const previewNode = useResolvePathForPreview({ path, currentWorkspace });
  const actualPath = previewNode?.path || path;

  // Create session ID from workspace + path for scroll sync
  const sessionId = scrollEmitterSession({ workspaceId: currentWorkspace.id, path });

  // Get or create scroll sync emitter for this session
  const scrollEmitter = getScrollEmitter(sessionId);

  // Setup iframe context
  const { iframeRef, contextProvider } = useIframeContextProvider();

  // Use shared preview logic
  usePreviewLogic({ contextProvider, path: actualPath, currentWorkspace, scrollEmitter, onContentLoaded });

  return (
    <div className="w-full h-full relative">
      <iframe key={path} ref={iframeRef} className="w-full h-full border-0 bg-white" title="Raw Preview" />
    </div>
  );
}
