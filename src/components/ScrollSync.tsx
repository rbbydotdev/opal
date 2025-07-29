import { nanoid } from "nanoid";
import { useSearchParams } from "next/navigation";
import { createContext, ReactNode, RefObject, useContext, useEffect, useMemo, useRef } from "react";

// --- Types ---
interface ScrollEmitter {
  onScroll: (cb: (x: number, y: number) => void) => UnsubFn;
  emitScroll: (x: number, y: number) => void;
  tearDown: () => void;
}
type UnsubFn = () => void;

// --- Context ---
interface ScrollSyncContextValue {
  scrollRef: RefObject<HTMLElement | null>;
  sessionId?: string;
}
const ScrollSyncCtx = createContext<ScrollSyncContextValue | null>(null);

export function useScrollSync() {
  const context = useContext(ScrollSyncCtx);
  if (!context) {
    throw new Error("useScrollSync must be used within a ScrollSyncProvider");
  }
  return context;
}

/// --- ScrollBroadcastChannel ---
export class ScrollBroadcastChannel implements ScrollEmitter {
  channel: BroadcastChannel;
  constructor(readonly sessionId: string) {
    this.channel = new BroadcastChannel(sessionId);
  }
  onScroll(cb: (x: number, y: number) => void): UnsubFn {
    const handler = (event: MessageEvent) => {
      const { x, y } = event.data;
      cb(x, y);
    };
    this.channel.addEventListener("message", handler);
    return () => this.channel.removeEventListener("message", handler);
  }
  emitScroll(x: number, y: number) {
    try {
      this.channel.postMessage({ x, y });
    } catch (_swallow) {
      console.warn("ScrollBroadcastChannel failed to post message, attempting to recover.");
      this.channel = new BroadcastChannel(this.sessionId);
      this.emitScroll(x, y);
    }
  }
  tearDown() {
    this.channel.close();
  }
}

export function sessionIdParam({ sessionId }: { sessionId: string }) {
  const searchParams = new URLSearchParams();
  searchParams.set("sessionId", sessionId);
  return searchParams.toString();
}

export function useScrollChannelFromSearchParams() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  useEffect(() => {
    if (!sessionId) {
      console.error("No sessionId provided in search params, using default sessionId.");
    }
  }, [sessionId]);
  return useScrollChannel({
    sessionId,
  });
}

// --- useScrollChannel hook ---
export function useScrollChannel({ sessionId }: { sessionId?: string | null } = {}) {
  const sId = useMemo(() => sessionId ?? `scroll-sync-${nanoid()}`, [sessionId]);
  const scrollEmitter = useMemo(() => new ScrollBroadcastChannel(sId), [sId]);
  useEffect(() => {
    return () => scrollEmitter.tearDown();
  }, [scrollEmitter]);
  return { scrollEmitter, sessionId: sId };
}

export function ScrollSyncProvider({
  scrollEmitter,
  sessionId,
  children,
  scrollEl,
}: {
  scrollEmitter: ScrollEmitter;
  sessionId?: string;
  scrollEl?: HTMLElement;
  children: ReactNode;
}) {
  const scrollRef = useRef<HTMLElement | null>(null);
  const scrollPause = useRef(false);

  useEffect(() => {
    const sRef = scrollEl ?? scrollRef.current;
    const unsubs: UnsubFn[] = [];
    if (sRef) {
      const handleScroll = () => {
        if (scrollPause.current) return;
        // Calculate relative scroll positions
        const maxScrollLeft = sRef.scrollWidth - sRef.clientWidth;
        const maxScrollTop = sRef.scrollHeight - sRef.clientHeight;
        const relX = maxScrollLeft > 0 ? sRef.scrollLeft / maxScrollLeft : 0;
        const relY = maxScrollTop > 0 ? sRef.scrollTop / maxScrollTop : 0;
        scrollEmitter.emitScroll(relX, relY);
      };
      sRef.addEventListener("scroll", handleScroll, { passive: true });
      unsubs.push(() => sRef.removeEventListener("scroll", handleScroll));
      unsubs.push(
        scrollEmitter.onScroll(async (relX, relY) => {
          scrollPause.current = true;
          const maxScrollLeft = sRef.scrollWidth - sRef.clientWidth;
          const maxScrollTop = sRef.scrollHeight - sRef.clientHeight;
          const x = relX * maxScrollLeft;
          const y = relY * maxScrollTop;
          const $scroll = new Promise((resolve) =>
            sRef.addEventListener("scroll", resolve, { passive: true, once: true })
          );
          sRef.scrollTo(x, y);
          await $scroll;
          scrollPause.current = false;
        })
      );
      return () => {
        unsubs.forEach((us) => us());
      };
    }
  }, [scrollEl, scrollEmitter]);

  return <ScrollSyncCtx.Provider value={{ scrollRef, sessionId }}>{children}</ScrollSyncCtx.Provider>;
}
