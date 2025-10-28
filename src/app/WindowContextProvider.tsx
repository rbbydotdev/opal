import { useEffect, useRef, useState } from "react";
import { PreviewContext, PreviewContextProvider, initializePreviewDocument } from "./PreviewCore";

export class WindowContextProvider implements PreviewContextProvider {
  private windowRef: Window | null = null;
  private ready: boolean = false;
  private context: PreviewContext | null = null;
  private onWindowClose?: () => void;

  constructor(onWindowClose?: () => void) {
    this.onWindowClose = onWindowClose;
  }

  openWindow(): boolean {
    if (this.windowRef && !this.windowRef.closed) {
      this.windowRef.focus();
      return true;
    }

    const newWindow = window.open("", "_blank", "width=800,height=600,scrollbars=yes,resizable=yes");
    if (!newWindow) {
      return false; // Popup blocked
    }

    this.windowRef = newWindow;
    initializePreviewDocument(newWindow.document, "Preview Window");

    // Handle window close
    const handleBeforeUnload = () => {
      this.cleanup();
      this.onWindowClose?.();
    };

    newWindow.addEventListener("beforeunload", handleBeforeUnload);
    this.ready = true;

    return true;
  }

  closeWindow(): void {
    if (this.windowRef && !this.windowRef.closed) {
      this.windowRef.close();
    }
  }

  getContext(): PreviewContext | null {
    if (!this.ready || !this.windowRef || this.windowRef.closed) {
      return null;
    }

    if (!this.context) {
      const doc = this.windowRef.document;
      const win = this.windowRef;
      const rootElement = doc.getElementById("preview-root");

      if (!rootElement) return null;

      this.context = {
        document: doc,
        window: win,
        rootElement,
      };
    }

    return this.context;
  }

  isReady(): boolean {
    return this.ready && this.windowRef !== null && !this.windowRef.closed;
  }

  isWindowOpen(): boolean {
    return this.windowRef !== null && !this.windowRef.closed;
  }

  cleanup(): void {
    this.ready = false;
    this.context = null;
    this.windowRef = null;
  }
}

export function useWindowContextProvider(): {
  contextProvider: WindowContextProvider;
  isWindowOpen: boolean;
  openWindow: () => boolean;
  closeWindow: () => void;
} {
  const [isWindowOpen, setIsWindowOpen] = useState(false);
  const contextProviderRef = useRef<WindowContextProvider | null>(null);

  // Create context provider once
  if (!contextProviderRef.current) {
    contextProviderRef.current = new WindowContextProvider(() => {
      setIsWindowOpen(false);
    });
  }

  const contextProvider = contextProviderRef.current;

  const openWindow = (): boolean => {
    const success = contextProvider.openWindow();
    if (success) {
      setIsWindowOpen(true);
    }
    return success;
  };

  const closeWindow = (): void => {
    contextProvider.closeWindow();
    setIsWindowOpen(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      contextProvider.cleanup();
    };
  }, [contextProvider]);

  return {
    contextProvider,
    isWindowOpen,
    openWindow,
    closeWindow,
  };
}
