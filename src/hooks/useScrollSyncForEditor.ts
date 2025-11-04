// import { Workspace } from "@/data/Workspace";
// import { AbsPath } from "@/lib/paths2";
// import { useEffect, useMemo, useRef } from "react";

// // Enhanced scroll sync interface with origin tracking and cleanup
// export interface ScrollSyncEmitter {
//   onScroll: (callback: (relX: number, relY: number, originId?: string) => void) => () => void;
//   emitScroll: (relX: number, relY: number, originId?: string) => void;
//   cleanup: () => void;
// }

// // Enhanced scroll sync emitter with origin tracking and cleanup
// export function createScrollSyncEmitter(): ScrollSyncEmitter {
//   const callbacks: Array<(relX: number, relY: number, originId?: string) => void> = [];

//   return {
//     onScroll: (callback: (relX: number, relY: number, originId?: string) => void) => {
//       callbacks.push(callback);
//       return () => {
//         const index = callbacks.indexOf(callback);
//         if (index > -1) callbacks.splice(index, 1);
//       };
//     },
//     emitScroll: (relX: number, relY: number, originId?: string) => {
//       callbacks.forEach((callback) => callback(relX, relY, originId));
//     },
//     cleanup: () => {
//       callbacks.length = 0; // Clear all callbacks
//     },
//   };
// }

// // Global registry for scroll emitters by session ID with reference counting
// const scrollEmitterRegistry = new Map<string, { emitter: ScrollSyncEmitter; refCount: number }>();

// export const scrollEmitterSession = function (
//   {
//     workspaceId,
//     path,
//   }: {
//     workspaceId?: string | null;
//     path?: string | null;
//   },
//   ...extra: string[]
// ): string | null {
//   if (!workspaceId || !path) return null;
//   return [workspaceId, path, ...extra].filter(Boolean).join(":");
// };

// // Get or create a scroll emitter for a session ID
// export function getScrollEmitter(sessionId: string | null): ScrollSyncEmitter | null {
//   if (!sessionId) return null;
//   const existing = scrollEmitterRegistry.get(sessionId);

//   if (existing) {
//     existing.refCount++;
//     return existing.emitter;
//   }

//   const emitter = createScrollSyncEmitter();
//   scrollEmitterRegistry.set(sessionId, { emitter, refCount: 1 });
//   return emitter;
// }

// // Release a scroll emitter reference
// export function releaseScrollEmitter(sessionId?: string | null): void {
//   if (!sessionId) return;
//   const existing = scrollEmitterRegistry.get(sessionId);

//   if (existing) {
//     existing.refCount--;

//     if (existing.refCount <= 0) {
//       existing.emitter.cleanup();
//       scrollEmitterRegistry.delete(sessionId);
//     }
//   }
// }
// export function useScrollSyncForEditor(currentWorkspace: Workspace | null, path: AbsPath | null) {
//   const originId = useRef(`editor-${Math.random().toString(36).substr(2, 9)}`);

//   // Create session ID from workspace + path
//   const sessionId = currentWorkspace && path ? `${currentWorkspace.name}:${path}` : undefined;

//   // Get the shared scroll emitter for this session
//   const newScrollEmitter = sessionId ? getScrollEmitter(sessionId) : undefined;

//   // Cleanup emitter reference on unmount
//   useEffect(() => {
//     return () => {
//       if (sessionId) {
//         releaseScrollEmitter(sessionId);
//       }
//     };
//   }, [sessionId]);

//   // Create adapter for ScrollSyncProvider compatibility (adds tearDown method and origin tracking)
//   const scrollEmitter = useMemo(() => {
//     if (!newScrollEmitter) {
//       // Return a no-op emitter when there's no session
//       return {
//         onScroll: () => () => {}, // Returns a no-op unsubscribe function
//         emitScroll: () => {},
//         tearDown: () => {},
//       };
//     }

//     return {
//       onScroll: (callback: (relX: number, relY: number) => void) => {
//         // Wrap the callback to filter out our own origin
//         return newScrollEmitter.onScroll((relX, relY, sourceOriginId) => {
//           if (sourceOriginId !== originId.current) {
//             callback(relX, relY);
//           }
//         });
//       },
//       emitScroll: (relX: number, relY: number) => {
//         newScrollEmitter.emitScroll(relX, relY, originId.current);
//       },
//       tearDown: () => {}, // no-op for compatibility with old ScrollSyncProvider interface
//     };
//   }, [newScrollEmitter]);

//   return { scrollEmitter, sessionId };
// }
