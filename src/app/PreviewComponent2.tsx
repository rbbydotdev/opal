import { useWorkspaceContext, useWorkspaceRoute } from "@/context/WorkspaceContext";
import { useResolvePathForPreview } from "@/features/preview-pane/useResolvePathForPreview";
import { usePreviewLogic } from "./PreviewCore";
import { useIframeContextProvider } from "./IframeContextProvider";

// Enhanced scroll sync interface with origin tracking and cleanup
export interface ScrollSyncEmitter {
  onScroll: (callback: (relX: number, relY: number, originId?: string) => void) => () => void;
  emitScroll: (relX: number, relY: number, originId?: string) => void;
  cleanup: () => void;
}

// Enhanced scroll sync emitter with origin tracking and cleanup
function createScrollSyncEmitter(): ScrollSyncEmitter {
  const callbacks: Array<(relX: number, relY: number, originId?: string) => void> = [];
  
  return {
    onScroll: (callback: (relX: number, relY: number, originId?: string) => void) => {
      callbacks.push(callback);
      return () => {
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
      };
    },
    emitScroll: (relX: number, relY: number, originId?: string) => {
      callbacks.forEach(callback => callback(relX, relY, originId));
    },
    cleanup: () => {
      callbacks.length = 0; // Clear all callbacks
    }
  };
}

// Global registry for scroll emitters by session ID with reference counting
const scrollEmitterRegistry = new Map<string, { emitter: ScrollSyncEmitter; refCount: number }>();

// Get or create a scroll emitter for a session ID
export function getScrollEmitter(sessionId: string): ScrollSyncEmitter {
  const existing = scrollEmitterRegistry.get(sessionId);
  
  if (existing) {
    existing.refCount++;
    return existing.emitter;
  }
  
  const emitter = createScrollSyncEmitter();
  scrollEmitterRegistry.set(sessionId, { emitter, refCount: 1 });
  return emitter;
}

// Release a scroll emitter reference
export function releaseScrollEmitter(sessionId: string): void {
  const existing = scrollEmitterRegistry.get(sessionId);
  
  if (existing) {
    existing.refCount--;
    
    if (existing.refCount <= 0) {
      existing.emitter.cleanup();
      scrollEmitterRegistry.delete(sessionId);
    }
  }
}

// Export scroll sync types and functions for editor integration
export { createScrollSyncEmitter };

export function PreviewComponent2({ onContentLoaded }: { onContentLoaded?: () => void } = {}) {
  const { path } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();

  // Resolve path for preview (handles CSS-to-markdown navigation)
  const previewNode = useResolvePathForPreview({ path, currentWorkspace });
  const actualPath = previewNode?.path || path;

  // Create session ID from workspace + path for scroll sync
  const sessionId = currentWorkspace && actualPath 
    ? `${currentWorkspace.name}:${actualPath}`
    : undefined;

  // Get or create scroll sync emitter for this session
  const scrollEmitter = sessionId ? getScrollEmitter(sessionId) : undefined;

  // Setup iframe context
  const { iframeRef, contextProvider } = useIframeContextProvider();

  // Use shared preview logic
  usePreviewLogic(contextProvider, actualPath, currentWorkspace, scrollEmitter, onContentLoaded);

  return (
    <div className="w-full h-full relative">
      <iframe ref={iframeRef} className="w-full h-full border-0" title="Raw Preview" />
    </div>
  );
}
