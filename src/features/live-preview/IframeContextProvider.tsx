import { WindowContext } from "@/features/live-preview/WindowContext";
import { BrowserDetection } from "@/lib/BrowserDetection";
import { CreateTypedEmitter } from "@/lib/events/TypeEmitter";
import { useContext, useEffect, useMemo, useSyncExternalStore } from "react";

export interface PreviewContext {
  document: Document | null;
  window: Window | null;
  // rootElement: HTMLElement | null;
  ready: boolean;
}

// Interface for context providers (iframe vs window)
interface PreviewContextProvider {
  context: PreviewContext | null;
  onReady: (callback: (ctx: PreviewContext | null) => void) => () => void;
  getContext: () => PreviewContext | null;
  teardown(): void;
}

export type ExtCtxReadyContext = {
  document: Document;
  window: Window;
  ready: true;
};
export type ExtCtxNotReadyContext = {
  document: null;
  window: null;
  ready: false;
};

type ExtCtxEventMap = {
  ready: PreviewContext | null;
  open: boolean;
};

const EMPTY_CONTEXT: ExtCtxNotReadyContext = {
  document: null,
  window: null,
  ready: false,
};

const FIREFOX_PREVIEW_HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Preview</title>
  </head>
  <body style="margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif;">
  </body>
</html>
`;

const CHROME_PREVIEW_HTML_INNER = `
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Preview</title>
  </head>
  <body style="margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif;">
  </body>
`;

abstract class BaseContextProvider implements PreviewContextProvider {
  protected _context: ExtCtxReadyContext | ExtCtxNotReadyContext = EMPTY_CONTEXT;
  protected events = CreateTypedEmitter<ExtCtxEventMap>();
  readonly workspaceName: string;

  onReady = (callback: (ctx: PreviewContext | null) => void) => {
    return this.events.listen("ready", callback);
  };
  getContext = () => {
    return this._context;
  };

  constructor({ workspaceName }: { workspaceName: string }) {
    this.workspaceName = workspaceName;
  }

  abstract get doc(): Document | null;
  abstract get win(): Window | null;

  get context(): ExtCtxNotReadyContext | ExtCtxReadyContext {
    if (!this.doc || !this.win) {
      return EMPTY_CONTEXT;
    }

    this._context = {
      document: this.doc,
      window: this.win,
      ready: true,
    } as ExtCtxReadyContext;

    return this._context;
  }

  // abstract init(): void;

  protected initializePreview = () => {
    if (!this.doc) {
      throw new Error("Document not available");
    }

    if (BrowserDetection.isFirefox()) {
      this.doc.open();
      this.doc.write(FIREFOX_PREVIEW_HTML);
      this.doc.close();
    } else {
      this.doc.documentElement.innerHTML = CHROME_PREVIEW_HTML_INNER;
    }

    this.events.emit("ready", this.context);
  };

  teardown(): void {
    this.events.removeAllListeners();
    this._context = EMPTY_CONTEXT;
  }
}

export function useIframeContextProvider({
  workspaceName,
  iframeRef,
}: {
  workspaceName: string;
  iframeRef: { current: HTMLIFrameElement | null };
}) {
  const contextProvider = useMemo(() => new IframeManager({ workspaceName, iframeRef }), [iframeRef, workspaceName]);
  const context = useSyncExternalStore(contextProvider.onReady, contextProvider.getContext);
  useEffect(() => {
    contextProvider.init();
    return () => contextProvider.teardown();
  }, [contextProvider]);

  return context;
}

export function useWindowContextProvider() {
  const context = useContext(WindowContext);
  if (!context) {
    throw new Error("useWindowContextProvider must be used within a WindowContextProviderComponent");
  }
  return context;
}

class IframeManager extends BaseContextProvider {
  private iframeRef: { current: HTMLIFrameElement | null };
  constructor({
    iframeRef,
    workspaceName,
  }: {
    workspaceName: string;

    iframeRef: { current: HTMLIFrameElement | null };
  }) {
    super({ workspaceName });
    this.iframeRef = iframeRef;
  }

  get doc(): Document | null {
    return this.iframeRef.current?.contentDocument || this.iframeRef.current?.contentWindow?.document || null;
  }

  get win(): Window | null {
    return this.iframeRef.current?.contentWindow || null;
  }

  init() {
    const iframe = this.iframeRef.current;
    if (!iframe) return;

    iframe.addEventListener("load", this.initializePreview, { once: true });
    const url = new URL(window.location.href);
    url.pathname = "/preview_blank.html";
    url.searchParams.set("workspaceName", this.workspaceName);
    iframe.src = url.toString();
  }
}

export class WindowManager extends BaseContextProvider {
  private windowRef: { current: Window | null } = { current: null };
  // private openEventEmitter = CreateTypedEmitter<{ openChange: boolean }>();
  private pollInterval: number | null = null;

  constructor({ workspaceName }: { workspaceName: string }) {
    super({ workspaceName });
  }

  onOpenChange = (callback: (isOpen: boolean) => void) => {
    return this.events.listen("open", callback);
  };
  getOpenState = () => {
    return this.windowRef.current !== null && !this.windowRef.current.closed;
  };

  get doc(): Document | null {
    return this.windowRef.current?.document || null;
  }

  get win(): Window | null {
    return this.windowRef.current;
  }

  open(): void {
    if (!this.windowRef.current || this.windowRef.current.closed) {
      const url = new URL(window.location.href);
      url.pathname = "/preview_blank.html";
      url.searchParams.set("workspaceName", this.workspaceName);
      url.searchParams.set("previewMode", "true");

      this.windowRef.current = window.open(url, "_blank");
      if (!this.windowRef.current) {
        throw new Error("Failed to open external window");
      }
    }
    this.windowRef.current.addEventListener("load", this.initializePreview);
    this.events.emit("open", true);
    this.events.emit("ready", this.context);

    const clearPoll = () => {
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }
    };
    // Poll to detect when window closes
    this.pollInterval = window.setInterval(() => {
      if (this.windowRef.current?.closed) {
        this.events.emit("open", false);
        clearPoll();
      }
    }, 1000);

    if (this.windowRef.current.document.readyState === "complete") {
      this.initializePreview();
    }
  }
  close() {
    if (this.windowRef.current && this.windowRef.current !== window) {
      this.windowRef.current.close();
      // Don't set to null immediately - let polling detect the close
      // this.windowRef.current = null;
    }
  }

  teardown(): void {
    super.teardown();
    this.close();
  }
}
