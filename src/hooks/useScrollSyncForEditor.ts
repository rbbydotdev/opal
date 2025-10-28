import { getScrollEmitter, releaseScrollEmitter } from "@/app/PreviewComponent2";
import { Workspace } from "@/data/Workspace";
import { AbsPath } from "@/lib/paths2";
import { useEffect, useMemo, useRef } from "react";

/**
 * Hook for connecting editors to the scroll sync system.
 * Creates a session-based scroll emitter and adapter for ScrollSyncProvider compatibility.
 * Handles cleanup and origin tracking to prevent feedback loops.
 */
export function useScrollSyncForEditor(currentWorkspace: Workspace | null, path: AbsPath | null) {
  const originId = useRef(`editor-${Math.random().toString(36).substr(2, 9)}`);
  
  // Create session ID from workspace + path
  const sessionId = currentWorkspace && path 
    ? `${currentWorkspace.name}:${path}`
    : undefined;
    
  // Get the shared scroll emitter for this session
  const newScrollEmitter = sessionId ? getScrollEmitter(sessionId) : undefined;
  
  // Cleanup emitter reference on unmount
  useEffect(() => {
    return () => {
      if (sessionId) {
        releaseScrollEmitter(sessionId);
      }
    };
  }, [sessionId]);
  
  // Create adapter for ScrollSyncProvider compatibility (adds tearDown method and origin tracking)
  const scrollEmitter = useMemo(() => {
    if (!newScrollEmitter) {
      // Return a no-op emitter when there's no session
      return {
        onScroll: () => () => {}, // Returns a no-op unsubscribe function
        emitScroll: () => {},
        tearDown: () => {}
      };
    }
    
    return {
      onScroll: (callback: (relX: number, relY: number) => void) => {
        // Wrap the callback to filter out our own origin
        return newScrollEmitter.onScroll((relX, relY, sourceOriginId) => {
          if (sourceOriginId !== originId.current) {
            callback(relX, relY);
          }
        });
      },
      emitScroll: (relX: number, relY: number) => {
        newScrollEmitter.emitScroll(relX, relY, originId.current);
      },
      tearDown: () => {} // no-op for compatibility with old ScrollSyncProvider interface
    };
  }, [newScrollEmitter]);

  return { scrollEmitter, sessionId };
}