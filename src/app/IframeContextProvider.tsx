import { CreateTypedEmitter } from "@/lib/TypeEmitter";
import { useEffect, useMemo, useSyncExternalStore } from "react";

export interface PreviewContext {
  document: Document | null;
  window: Window | null;
  rootElement: HTMLElement | null;
  ready: boolean;
}

// Interface for context providers (iframe vs window)
export interface PreviewContextProvider {
  context: PreviewContext | null;
  onReady: (callback: (ctx: PreviewContext | null) => void) => () => void;
  getContext: () => PreviewContext | null;
  teardown(): void;
}

export type ExtCtxReadyContext = {
  document: Document;
  window: Window;
  rootElement: HTMLElement;
  ready: true;
};
export type ExtCtxNotReadyContext = {
  document: null;
  window: null;
  rootElement: null;
  ready: false;
};

const ExtCtxEvents = {
  READY: "ready",
} as const;

type ExtCtxEventMap = {
  [ExtCtxEvents.READY]: PreviewContext | null;
};

const EMPTY_CONTEXT: ExtCtxNotReadyContext = {
  document: null,
  window: null,
  rootElement: null,
  ready: false,
};

const PREVIEW_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Preview</title>
  </head>
  <body style="margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif;">
    <div id="preview-root"></div>
  </body>
</html>
`;

const PREVIEW_HTML_INNER = `
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Preview</title>
  </head>
  <body style="margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif;">
    <div id="preview-root"></div>
  </body>
`;

abstract class BaseContextProvider implements PreviewContextProvider {
  protected _context: ExtCtxReadyContext | ExtCtxNotReadyContext = EMPTY_CONTEXT;
  protected unsubs: (() => void)[] = [];
  protected events = CreateTypedEmitter<ExtCtxEventMap>();

  onReady = (callback: (ctx: PreviewContext | null) => void) => {
    return this.events.listen(ExtCtxEvents.READY, callback);
  };
  getContext = () => {
    return this._context;
  };

  abstract get doc(): Document | null;
  abstract get win(): Window | null;
  abstract get rootEl(): HTMLElement | null;

  get context(): ExtCtxNotReadyContext | ExtCtxReadyContext {
    if (!this.doc || !this.win || !this.rootEl) {
      return EMPTY_CONTEXT;
    }

    this._context = {
      document: this.doc,
      window: this.win,
      rootElement: this.rootEl,
      ready: true,
    } as ExtCtxReadyContext;

    return this._context;
  }

  // abstract init(): void;

  protected initializePreview = () => {
    if (!this.doc) {
      throw new Error("Document not available");
    }

    const isFirefox = navigator.userAgent.includes("Firefox");

    if (isFirefox) {
      this.doc.open();
      this.doc.write(PREVIEW_HTML);
      this.doc.close();
    } else {
      this.doc.documentElement.innerHTML = PREVIEW_HTML_INNER;
    }

    this.events.emit(ExtCtxEvents.READY, this.context);
  };

  teardown(): void {
    this.events.removeAllListeners();
    this._context = EMPTY_CONTEXT;
    this.unsubs.forEach((unsub) => unsub());
  }
}

export function useIframeContextProvider({ iframeRef }: { iframeRef: { current: HTMLIFrameElement | null } }) {
  const contextProvider = useMemo(() => new IframeContextProvider(iframeRef), [iframeRef]);
  const context = useSyncExternalStore(contextProvider.onReady, contextProvider.getContext);
  useEffect(() => {
    contextProvider.init();
    return () => contextProvider.teardown();
  }, [contextProvider]);

  return context;
}

export function useWindowContextProvider() {
  const contextProvider = useMemo(() => new WindowContextProvider(), []);
  const context = useSyncExternalStore(contextProvider.onReady, contextProvider.getContext);
  const isOpen = useSyncExternalStore(contextProvider.onOpenChange, contextProvider.getOpenState);
  useEffect(() => {
    return () => contextProvider.teardown();
  }, [contextProvider]);

  return {
    ...context,
    isOpen,
    open: () => contextProvider.open(),
    close: () => {
      contextProvider.close();
    },
  };
}

export function useContextProvider<T extends PreviewContextProvider>(providerFactoryFn: () => T) {
  const provider = useMemo(() => providerFactoryFn(), [providerFactoryFn]);
  const context = useSyncExternalStore(provider.onReady, provider.getContext);
  useEffect(() => {
    return () => provider.teardown();
  }, [provider]);

  return context;
}

export class IframeContextProvider extends BaseContextProvider {
  constructor(private iframeRef: { current: HTMLIFrameElement | null }) {
    super();
  }

  get doc(): Document | null {
    return this.iframeRef.current?.contentDocument || this.iframeRef.current?.contentWindow?.document || null;
  }

  get win(): Window | null {
    return this.iframeRef.current?.contentWindow || null;
  }

  get rootEl(): HTMLElement | null {
    return this.iframeRef.current?.contentDocument?.getElementById("preview-root") || null;
  }
  init() {
    const iframe = this.iframeRef.current;
    if (!iframe) return;

    iframe.addEventListener("load", this.initializePreview);
    this.unsubs.push(() => {
      iframe.removeEventListener("load", this.initializePreview);
    });
    iframe.src = "/preview_blank.html";
  }
}

export class WindowContextProvider extends BaseContextProvider {
  private windowRef: { current: Window | null } = { current: null };
  private openEventEmitter = CreateTypedEmitter<{ openChange: boolean }>();
  private pollInterval: number | null = null;

  constructor() {
    super();
  }

  onOpenChange = (callback: (isOpen: boolean) => void) => {
    return this.openEventEmitter.listen("openChange", callback);
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

  get rootEl(): HTMLElement | null {
    return this.windowRef.current?.document?.getElementById("preview-root") || null;
  }

  open(): void {
    if (!this.windowRef.current || this.windowRef.current.closed) {
      this.windowRef.current = window.open("/preview_blank.html?previewMode=true", "_blank");
      if (!this.windowRef.current) {
        throw new Error("Failed to open external window");
      }
    }
    this.windowRef.current.addEventListener("load", this.initializePreview);
    this.openEventEmitter.emit("openChange", true);

    const clearPoll = () => {
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }
    };
    // Poll to detect when window closes
    this.pollInterval = window.setInterval(() => {
      if (this.windowRef.current?.closed) {
        this.openEventEmitter.emit("openChange", false);
        clearPoll();
      }
    }, 1000);

    this.unsubs.push(() => {
      this.windowRef.current?.removeEventListener("load", this.initializePreview);
      clearPoll();
    });

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
