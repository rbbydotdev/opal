import { ScrollEventsConts } from "@/features/live-preview/ScrollEventsConts";
import {
  ScrollEventPayload,
  ScrollSyncContext,
  useScrollSyncContext,
} from "@/features/live-preview/useScrollSyncContext";
import { useLocalStorage } from "@/features/local-storage/useLocalStorage";
import { SuperEmitter } from "@/lib/events/TypeEmitter";
import { useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { nanoid } from "nanoid";
import { RefObject, useEffect, useMemo, useRef } from "react";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function useScrollSync({
  elementRef,
  listenRef,
  path: currentPath,
  workspaceName,
}: {
  elementRef: RefObject<HTMLElement | null>;
  listenRef?: RefObject<HTMLElement | null>;
  path?: string;
  workspaceName?: string;
}) {
  listenRef = listenRef || elementRef;
  const context = useScrollSyncContext();
  const workspaceRoute = useWorkspaceRoute();
  const path = currentPath || workspaceRoute.path;
  const name = workspaceName || workspaceRoute.name;
  const originId = useMemo(() => nanoid(), []);
  const scrollId = name! + path!;
  const scrollPause = useRef(false);

  if (!context) {
    throw new Error("useScrollSync must be used within a ScrollSyncProvider");
  }

  useEffect(() => {
    const el = elementRef.current;
    const listenEl = listenRef.current;
    const emitter = context.emitter;

    if (!el || !emitter || !listenEl || !context.enabled) return;

    const handleScroll = () => {
      if (scrollPause.current) return;

      const maxX = el.scrollWidth - el.clientWidth;
      const maxY = el.scrollHeight - el.clientHeight;
      const relX = clamp(maxX > 0 ? el.scrollLeft / maxX : 0);
      const relY = clamp(maxY > 0 ? el.scrollTop / maxY : 0);

      emitter.emit(ScrollEventsConts.SCROLL, { x: relX, y: relY, scrollId, originId });
    };

    const handleScrollEvent = async ({
      x,
      y,
      scrollId: incomingScrollId,
      originId: incomingOriginId,
    }: ScrollEventPayload[typeof ScrollEventsConts.SCROLL]) => {
      if (incomingScrollId !== scrollId || incomingOriginId === originId) return;

      scrollPause.current = true;
      const maxX = el.scrollWidth - el.clientWidth;
      const maxY = el.scrollHeight - el.clientHeight;
      const targetX = x * maxX;
      const targetY = y * maxY;

      listenEl.addEventListener(
        "scroll",
        () => {
          scrollPause.current = false;
        },
        {
          once: true,
        }
      );
      el.scrollTo(targetX, targetY);
    };

    listenEl.addEventListener("scroll", handleScroll, { passive: true });
    const unsubscribe = emitter.on(ScrollEventsConts.SCROLL, handleScrollEvent);

    return () => {
      el.removeEventListener("scroll", handleScroll);
      unsubscribe();
    };
  }, [context.emitter, elementRef, listenRef, originId, scrollId, context.enabled]);

  return { ...context, originId, scrollId };
}

export function ScrollSyncProvider({ children, id }: { children: React.ReactNode; id: string }) {
  const emitter = useMemo(() => new SuperEmitter<ScrollEventPayload>(), []);
  const { storedValue: enabled, setStoredValue: setEnabled } = useLocalStorage(`live-preview/scroll-sync/${id}`, true);
  return (
    <ScrollSyncContext.Provider value={{ emitter, toggle: setEnabled, enabled }}>{children}</ScrollSyncContext.Provider>
  );
}

export function ScrollSync({
  children,
  elementRef,
  listenRef,
  path,
  workspaceName,
}: {
  children: React.ReactNode;
  elementRef: RefObject<HTMLElement | null>;
  workspaceName?: string;
  path?: string;
  listenRef?: RefObject<HTMLElement | null>;
}) {
  useScrollSync({ elementRef, listenRef, path, workspaceName });
  return <>{children}</>;
}
