import { useWorkspaceRoute } from "@/context/WorkspaceContext";
import { SuperEmitter } from "@/lib/TypeEmitter";
import { nanoid } from "nanoid";
import { createContext, RefObject, useContext, useEffect, useMemo, useRef } from "react";

const ScrollEvents = {
  SCROLL: "scroll" as const,
};
type ScrollEventPayload = {
  [ScrollEvents.SCROLL]: { x: number; y: number; scrollId: string; originId: string };
};

const ScrollSyncCtx = createContext<{
  emitter: SuperEmitter<ScrollEventPayload>;
} | null>(null);

function clamp(value: number, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

export function useScrollSync({
  elementRef,
  listenRef,
}: {
  elementRef: RefObject<HTMLElement | null>;
  listenRef?: RefObject<HTMLElement | null>;
}) {
  listenRef = listenRef || elementRef;
  const context = useContext(ScrollSyncCtx);
  const { name, path } = useWorkspaceRoute();
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
    if (!el || !emitter || !listenEl) return;

    const handleScroll = () => {
      // console.log("emitting scroll");
      if (scrollPause.current) return;

      const maxX = el.scrollWidth - el.clientWidth;
      const maxY = el.scrollHeight - el.clientHeight;
      const relX = clamp(maxX > 0 ? el.scrollLeft / maxX : 0);
      const relY = clamp(maxY > 0 ? el.scrollTop / maxY : 0);

      emitter.emit(ScrollEvents.SCROLL, { x: relX, y: relY, scrollId, originId });
    };

    const handleScrollEvent = async ({
      x,
      y,
      scrollId: incomingScrollId,
      originId: incomingOriginId,
    }: ScrollEventPayload[typeof ScrollEvents.SCROLL]) => {
      if (incomingScrollId !== scrollId || incomingOriginId === originId) return;

      scrollPause.current = true;
      const maxX = el.scrollWidth - el.clientWidth;
      const maxY = el.scrollHeight - el.clientHeight;
      el.scrollTo(x * maxX, y * maxY);
      scrollPause.current = false;
    };

    listenEl.addEventListener("scroll", handleScroll, { passive: true });
    const unsubscribe = emitter.on(ScrollEvents.SCROLL, handleScrollEvent);

    return () => {
      el.removeEventListener("scroll", handleScroll);
      unsubscribe();
    };
  }, [context.emitter, elementRef, listenRef, originId, scrollId]);

  return { ...context, originId, scrollId };
}

export function ScrollSyncProvider({ children }: { children: React.ReactNode }) {
  const emitter = useMemo(() => new SuperEmitter<ScrollEventPayload>(), []);
  return <ScrollSyncCtx.Provider value={{ emitter }}>{children}</ScrollSyncCtx.Provider>;
}

export function ScrollSync({
  children,
  elementRef,
  listenRef,
}: {
  children: React.ReactNode;
  elementRef: RefObject<HTMLElement | null>;
  listenRef?: RefObject<HTMLElement | null>;
}) {
  useScrollSync({ elementRef, listenRef });
  return <>{children}</>;
}
