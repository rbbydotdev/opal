import { useWorkspaceRoute } from "@/context/WorkspaceContext";
import { Channel } from "@/lib/channel";
import { absPath, joinPath } from "@/lib/paths2";
import { useSearch } from "@tanstack/react-router";
import { nanoid } from "nanoid";
import { createContext, ReactNode, RefObject, useContext, useEffect, useMemo, useRef } from "react";

// --- Types ---
interface ScrollEmitter {
  onScroll: (cb: (x: number, y: number) => void) => UnsubFn;
  emitScroll: (x: number, y: number) => void;
  tearDown: () => void;
}
type UnsubFn = () => void;

const ScrollEvents = {
  SCROLL: "scroll" as const,
};
type ScrollEventPayload = {
  [ScrollEvents.SCROLL]: { x: number; y: number };
};

// --- Context ---
interface ScrollSyncContextValue {
  scrollRef: RefObject<HTMLElement | null>;
  sessionId?: string;
  previewURL: string;
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
export class ScrollBroadcastChannel extends Channel<ScrollEventPayload> implements ScrollEmitter {
  constructor(readonly sessionId: string) {
    super(sessionId);
  }

  onScroll(cb: (x: number, y: number) => void): UnsubFn {
    return this.on(ScrollEvents.SCROLL, ({ x, y }) => {
      cb(x, y);
    });
  }

  emitScroll(x: number, y: number) {
    void this.emit(ScrollEvents.SCROLL, { x, y });
  }
}

export function sessionIdParam({ sessionId }: { sessionId: string }) {
  const searchParams = new URLSearchParams();
  searchParams.set("sessionId", sessionId);
  return searchParams.toString();
}

export function useScrollChannelFromSearchParams() {
  const search = useSearch({ from: "__root__" }) as { sessionId?: string | null };
  const sessionId = search?.sessionId || null;
  useEffect(() => {
    if (!sessionId) {
      console.error("No sessionId provided in search params, using default sessionId.");
    }
  }, [sessionId]);
  return useScrollChannel({
    sessionId,
  });
}

export function workspacePathSessionId({ workspaceId, filePath }: { workspaceId: string; filePath: string }): string {
  return `${workspaceId}${filePath}`;
}
export function useWorkspacePathPreviewURL() {
  const { id: workspaceId, path: filePath } = useWorkspaceRoute();
  if (!workspaceId || !filePath) {
    throw new Error("useWorkspacePathPreviewURL must be used within a WorkspaceRoute context with valid id and path");
  }

  const previewURL = joinPath(
    absPath("preview"),
    workspaceId!,
    filePath! + `?${sessionIdParam({ sessionId: workspacePathSessionId({ workspaceId, filePath }) })}`
  ) as string;
  return previewURL;
}

export function useWorkspacePathScrollChannel() {
  const { id: workspaceId, path: filePath } = useWorkspaceRoute();
  if (!workspaceId || !filePath) {
    throw new Error(
      "useWorkspacePathScrollChannel must be used within a WorkspaceRoute context with valid id and path"
    );
  }
  return useScrollChannel({
    sessionId: workspacePathSessionId({ workspaceId, filePath }),
  });
}
// --- useScrollChannel hook ---
export function useScrollChannel({ sessionId }: { sessionId?: string | null } = {}) {
  const sId = useMemo(() => sessionId ?? `scroll-sync-${nanoid()}`, [sessionId]);
  const scrollEmitter = useMemo(() => new ScrollBroadcastChannel(sId), [sId]);
  useEffect(() => {
    const cleanup = scrollEmitter.init();
    return () => {
      cleanup();
      scrollEmitter.tearDown();
    };
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

  const { id: workspaceId, path: filePath } = useWorkspaceRoute();

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

  const previewURL = useWorkspacePathPreviewURL();

  return <ScrollSyncCtx.Provider value={{ scrollRef, sessionId, previewURL }}>{children}</ScrollSyncCtx.Provider>;
}
