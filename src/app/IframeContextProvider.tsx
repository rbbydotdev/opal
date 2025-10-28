import { useEffect, useRef, useState } from "react";
import { PreviewContext, PreviewContextProvider, initializePreviewDocument } from "./PreviewCore";

export class IframeContextProvider implements PreviewContextProvider {
  private iframeRef: React.RefObject<HTMLIFrameElement | null>;
  private ready: boolean = false;
  private context: PreviewContext | null = null;

  constructor(iframeRef: React.RefObject<HTMLIFrameElement | null>) {
    this.iframeRef = iframeRef;
  }

  getContext(): PreviewContext | null {
    if (!this.ready || !this.iframeRef.current?.contentDocument || !this.iframeRef.current?.contentWindow) {
      return null;
    }

    if (!this.context) {
      const iframe = this.iframeRef.current;
      const doc = iframe.contentDocument!;
      const win = iframe.contentWindow!;
      const rootElement = doc.getElementById("preview-root");

      if (!rootElement) return null;

      this.context = {
        document: doc,
        window: win,
        rootElement
      };
    }

    return this.context;
  }

  isReady(): boolean {
    return this.ready;
  }

  setReady(ready: boolean): void {
    this.ready = ready;
    if (!ready) {
      this.context = null;
    }
  }

  cleanup(): void {
    this.ready = false;
    this.context = null;
  }
}

export function useIframeContextProvider(): {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  contextProvider: IframeContextProvider;
} {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const contextProviderRef = useRef<IframeContextProvider | null>(null);

  // Create context provider once
  if (!contextProviderRef.current) {
    contextProviderRef.current = new IframeContextProvider(iframeRef);
  }

  const contextProvider = contextProviderRef.current;

  // Initialize iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      const iframeDoc = iframe.contentDocument;
      if (!iframeDoc) return;

      initializePreviewDocument(iframeDoc, "Preview");
      contextProvider.setReady(true);
    };

    iframe.addEventListener("load", handleLoad);
    iframe.src = "about:blank";

    return () => {
      iframe.removeEventListener("load", handleLoad);
      contextProvider.cleanup();
    };
  }, [contextProvider]);

  return { iframeRef, contextProvider };
}