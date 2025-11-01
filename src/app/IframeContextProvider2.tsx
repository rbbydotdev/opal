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
  init(): void;
  onReady: (callback: (ctx: PreviewContext | null) => void) => void;
  teardown(): void;
}

export type IframeReadyContext = {
  document: Document;
  window: Window;
  rootElement: HTMLElement;
  ready: true;
};
export type IframeNotReadyContext = {
  document: null;
  window: null;
  rootElement: null;
  ready: false;
};

const IframeEvents = {
  READY: "ready",
} as const;

type IframeEventMap = {
  [IframeEvents.READY]: PreviewContext | null;
};
const EMPTY_CONTEXT: IframeNotReadyContext = {
  document: null,
  window: null,
  rootElement: null,
  ready: false,
};
class IframeContextProvider implements PreviewContextProvider {
  constructor(private iframeRef: React.RefObject<HTMLIFrameElement | null>) {}
  private _context: IframeReadyContext | IframeNotReadyContext = EMPTY_CONTEXT;
  private unsubs: (() => void)[] = [];
  private events = CreateTypedEmitter<IframeEventMap>();

  onReady = (callback: (ctx: PreviewContext | null) => void) => {
    return this.events.listen(IframeEvents.READY, callback);
  };
  getContext = () => {
    return this._context;
  };

  private get doc() {
    return this.iframeRef.current?.contentDocument || null;
  }
  private get win() {
    return this.iframeRef.current?.contentWindow || null;
  }
  private get rootEl() {
    return this.iframeRef.current?.contentDocument?.getElementById("preview-root") || null;
  }

  get context(): IframeNotReadyContext | IframeReadyContext {
    if (!this.doc || !this.win || !this.rootEl) {
      return EMPTY_CONTEXT;
    }

    this._context = {
      document: this.doc,
      window: this.win,
      rootElement: this.rootEl,
      ready: true,
    } as IframeReadyContext;

    return this._context;
  }
  init() {
    const iframe = this.iframeRef.current;
    if (!iframe) return;

    iframe.addEventListener("load", this.initializePreview);
    this.unsubs.push(() => {
      iframe.removeEventListener("load", this.initializePreview);
    });
    iframe.src = "about:blank";
  }

  private initializePreview = () => {
    console.log("Initializing preview document");
    if (!this.doc) {
      throw new Error("Iframe document not available");
    }
    this.doc.open();
    this.doc.write(/*html*/ `
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
  `);
    this.doc.close();
    this.events.emit(IframeEvents.READY, this.context);
  };
  teardown(): void {
    this.events.removeAllListeners();
    this._context = EMPTY_CONTEXT;
    this.unsubs.forEach((unsub) => unsub());
  }
}

export function useIframeContextProvider({ iframeRef }: { iframeRef: React.RefObject<HTMLIFrameElement | null> }) {
  const contextProvider = useMemo(() => new IframeContextProvider(iframeRef), [iframeRef]);
  const context = useSyncExternalStore(contextProvider.onReady, contextProvider.getContext);
  useEffect(() => {
    contextProvider.init();
    return () => contextProvider.teardown();
  }, [contextProvider]);

  return context;
}
