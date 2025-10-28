import { useLiveCssFiles } from "@/components/Editor/useLiveCssFiles";
import { useLiveFileContent } from "@/context/useFileContents";
import { useWorkspaceContext, useWorkspaceRoute } from "@/context/WorkspaceContext";
import { Workspace } from "@/data/Workspace";
import { TemplateManager } from "@/features/templating";
import { stripFrontmatter } from "@/lib/markdown/frontMatter";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import { AbsPath, isEjs, isHtml, isImage, isMarkdown, isMustache } from "@/lib/paths2";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { useResolvePathForPreview } from "@/features/preview-pane/useResolvePathForPreview";

interface IFrameContentProps {
  path: AbsPath | null;
  currentWorkspace: Workspace;
  scrollEmitter?: ScrollSyncEmitter;
  iframeDocument?: Document;
  iframeWindow?: Window;
}

// Enhanced scroll sync interface with origin tracking and cleanup
interface ScrollSyncEmitter {
  onScroll: (callback: (relX: number, relY: number, originId?: string) => void) => () => void;
  emitScroll: (relX: number, relY: number, originId?: string) => void;
  cleanup: () => void;
}

// Enhanced scroll sync emitter with origin tracking and cleanup
function createScrollSyncEmitter(): ScrollSyncEmitter {
  const callbacks: Array<(relX: number, relY: number, originId?: string) => void> = [];
  
  return {
    onScroll: (callback: (relX: number, relY: number, originId?: string) => void) => {
      callbacks.push(callback);
      return () => {
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
      };
    },
    emitScroll: (relX: number, relY: number, originId?: string) => {
      callbacks.forEach(callback => callback(relX, relY, originId));
    },
    cleanup: () => {
      callbacks.length = 0; // Clear all callbacks
    }
  };
}

// Global registry for scroll emitters by session ID with reference counting
const scrollEmitterRegistry = new Map<string, { emitter: ScrollSyncEmitter; refCount: number }>();

// Get or create a scroll emitter for a session ID
function getScrollEmitter(sessionId: string): ScrollSyncEmitter {
  const existing = scrollEmitterRegistry.get(sessionId);
  
  if (existing) {
    existing.refCount++;
    return existing.emitter;
  }
  
  const emitter = createScrollSyncEmitter();
  scrollEmitterRegistry.set(sessionId, { emitter, refCount: 1 });
  return emitter;
}

// Release a scroll emitter reference
function releaseScrollEmitter(sessionId: string): void {
  const existing = scrollEmitterRegistry.get(sessionId);
  
  if (existing) {
    existing.refCount--;
    
    if (existing.refCount <= 0) {
      existing.emitter.cleanup();
      scrollEmitterRegistry.delete(sessionId);
    }
  }
}

// Export scroll sync types and functions for editor integration
export type { ScrollSyncEmitter };
export { createScrollSyncEmitter, getScrollEmitter, releaseScrollEmitter };

// Hook for setting up scroll sync on the iframe document
function useScrollSync(scrollEmitter?: ScrollSyncEmitter, iframeDocument?: Document, iframeWindow?: Window) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const originId = useRef(`iframe-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (!scrollEmitter || !iframeDocument || !iframeWindow) return;

    const scrollElement = iframeDocument.documentElement;

    // Listen for scroll events from other components
    const unsubscribe = scrollEmitter.onScroll(async (relX, relY, sourceOriginId) => {
      // Don't react to our own scroll events
      if (sourceOriginId === originId.current || isScrollingRef.current) return;
      
      const maxScrollLeft = scrollElement.scrollWidth - scrollElement.clientWidth;
      const maxScrollTop = scrollElement.scrollHeight - scrollElement.clientHeight;
      const scrollLeft = relX * maxScrollLeft;
      const scrollTop = relY * maxScrollTop;
      
      isScrollingRef.current = true;
      
      // Wait for scroll to complete using promise like original implementation
      const scrollPromise = new Promise<void>((resolve) => {
        const handleScrollComplete = () => {
          iframeDocument.removeEventListener('scroll', handleScrollComplete);
          resolve();
        };
        iframeDocument.addEventListener('scroll', handleScrollComplete, { passive: true, once: true });
      });
      
      iframeWindow.scrollTo(scrollLeft, scrollTop);
      await scrollPromise;
      
      isScrollingRef.current = false;
    });

    // Send our scroll events to other components
    const handleScroll = () => {
      if (isScrollingRef.current) return; // Don't emit during programmatic scroll
      
      const maxScrollLeft = scrollElement.scrollWidth - scrollElement.clientWidth;
      const maxScrollTop = scrollElement.scrollHeight - scrollElement.clientHeight;
      const relX = maxScrollLeft > 0 ? iframeWindow.scrollX / maxScrollLeft : 0;
      const relY = maxScrollTop > 0 ? iframeWindow.scrollY / maxScrollTop : 0;
      
      scrollEmitter.emitScroll(relX, relY, originId.current);
    };

    iframeDocument.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      unsubscribe();
      iframeDocument.removeEventListener('scroll', handleScroll);
    };
  }, [scrollEmitter, iframeDocument, iframeWindow]);

  return containerRef;
}

export function PreviewComponent2() {
  const { path } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeReady, setIframeReady] = useState(false);

  // Resolve path for preview (handles CSS-to-markdown navigation)
  const previewNode = useResolvePathForPreview({ path, currentWorkspace });
  const actualPath = previewNode?.path || path;

  // Get CSS files (this runs in parent context)
  const cssFiles = useLiveCssFiles({ path: actualPath, currentWorkspace });

  // Create session ID from workspace + path for scroll sync
  const sessionId = currentWorkspace && actualPath 
    ? `${currentWorkspace.name}:${actualPath}`
    : undefined;

  // Get or create scroll sync emitter for this session
  const scrollEmitter = sessionId ? getScrollEmitter(sessionId) : undefined;

  // Initialize iframe with blank document
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      const iframeDoc = iframe.contentDocument;
      if (!iframeDoc) return;

      // Create a clean HTML document structure
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Preview</title>
          </head>
          <body style="margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif;">
            <div id="iframe-root"></div>
          </body>
        </html>
      `);
      iframeDoc.close();

      setIframeReady(true);
    };

    iframe.addEventListener("load", handleLoad);

    // Set src to about:blank to trigger load event
    iframe.src = "about:blank";

    return () => {
      iframe.removeEventListener("load", handleLoad);
    };
  }, []);

  // Inject CSS files into iframe head (from parent context)
  useEffect(() => {
    if (!iframeReady || !iframeRef.current?.contentDocument) return;

    const iframeDoc = iframeRef.current.contentDocument;
    const iframeHead = iframeDoc.head;

    // Remove existing preview CSS
    const existingLinks = iframeHead.querySelectorAll('link[data-preview-css="true"]');
    existingLinks.forEach((link) => link.remove());

    // Add new CSS files
    cssFiles.forEach((cssFile) => {
      const link = iframeDoc.createElement("link");
      link.rel = "stylesheet";
      link.href = cssFile;
      link.setAttribute("data-preview-css", "true");
      iframeHead.appendChild(link);
    });
  }, [iframeReady, cssFiles]);

  // Render content into iframe when ready
  useEffect(() => {
    if (!iframeReady || !iframeRef.current?.contentDocument || !actualPath || !currentWorkspace) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) return;
    const rootElement = iframeDoc.getElementById("iframe-root");

    if (!rootElement) return;

    // Create isolated React root in iframe
    const root = createRoot(rootElement);

    // Render content based on file type with scroll sync
    root.render(
      <IFrameContent 
        path={actualPath} 
        currentWorkspace={currentWorkspace}
        scrollEmitter={scrollEmitter}
        iframeDocument={iframeDoc}
        iframeWindow={iframe.contentWindow || undefined}
      />
    );

    return () => {
      // Use setTimeout to avoid React render race condition
      setTimeout(() => {
        try {
          root.unmount();
        } catch (error) {
          console.warn('Error unmounting iframe React root:', error);
        }
      }, 0);
    };
  }, [iframeReady, actualPath, currentWorkspace, scrollEmitter]);

  return (
    <div className="w-full h-full relative">
      <iframe ref={iframeRef} className="w-full h-full border-0" title="Raw Preview" />
    </div>
  );
}

// This component runs inside the iframe without any router context
function IFrameContent({ path, currentWorkspace, scrollEmitter, iframeDocument, iframeWindow }: IFrameContentProps) {
  if (!path) return <div>No file selected</div>;

  if (isMarkdown(path)) {
    return <MarkdownRenderer path={path} currentWorkspace={currentWorkspace} scrollEmitter={scrollEmitter} iframeDocument={iframeDocument} iframeWindow={iframeWindow} />;
  }

  if (isImage(path)) {
    return <img src={path} alt="Preview" style={{ maxWidth: "100%", height: "auto" }} />;
  }

  if (isMustache(path) || isEjs(path)) {
    return <TemplateRenderer path={path} currentWorkspace={currentWorkspace} />;
  }

  if (isHtml(path)) {
    return <HtmlRenderer path={path} currentWorkspace={currentWorkspace} />;
  }

  return <div>Unsupported file type for preview: {path}</div>;
}

// Isolated renderer components (no router hooks)
function MarkdownRenderer({ path, currentWorkspace, scrollEmitter, iframeDocument, iframeWindow }: { path: AbsPath; currentWorkspace: Workspace; scrollEmitter?: ScrollSyncEmitter; iframeDocument?: Document; iframeWindow?: Window }) {
  const content = useLiveFileContent(currentWorkspace, path);
  const [html, setHtml] = useState<string>("");
  const containerRef = useScrollSync(scrollEmitter, iframeDocument, iframeWindow);

  useEffect(() => {
    try {
      const markdownContent = stripFrontmatter(content || "");
      const renderedHtml = renderMarkdownToHtml(markdownContent);
      setHtml(renderedHtml);
    } catch (error) {
      console.error("Error rendering markdown:", error);
      setHtml('<div style="color: red; padding: 16px;">Error rendering markdown</div>');
    }
  }, [content]);

  return (
    <div 
      ref={containerRef}
      style={{ width: "100%", height: "100%", overflow: "auto" }} 
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function TemplateRenderer({ path, currentWorkspace }: { path: AbsPath; currentWorkspace: Workspace }) {
  const content = useLiveFileContent(currentWorkspace, path);
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    const renderTemplate = async () => {
      try {
        const templateManager = new TemplateManager(currentWorkspace);
        const templateType = isMustache(path) ? "mustache" : isEjs(path) ? "ejs" : "html";

        const rendered = await templateManager.renderStringWithMarkdown(
          content || "",
          {
            date: new Date(),
            data: {
              title: "Preview",
              name: "User",
            },
          },
          [],
          templateType
        );
        setHtml(rendered);
      } catch (error) {
        console.error("Template render error:", error);
        const err = error as Error;
        const message = err.message || String(err);
        const stack = err.stack || "";
        setHtml(`<div style="color: rgb(220, 38, 38); padding: 16px; border: 1px solid rgb(252, 165, 165); border-radius: 8px;">
          <div><strong>Template Render Error:</strong> ${message}</div>
          ${stack ? `<pre style="margin-top: 8px; white-space: pre-wrap; font-size: 14px;">${stack}</pre>` : ""}
        </div>`);
      }
    };

    void renderTemplate();
  }, [content, path, currentWorkspace]);

  return <div style={{ width: "100%", height: "100%", overflow: "auto" }} dangerouslySetInnerHTML={{ __html: html }} />;
}

function HtmlRenderer({ path, currentWorkspace }: { path: AbsPath; currentWorkspace: Workspace }) {
  const content = useLiveFileContent(currentWorkspace, path);

  return (
    <div style={{ width: "100%", height: "100%", overflow: "auto" }} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
