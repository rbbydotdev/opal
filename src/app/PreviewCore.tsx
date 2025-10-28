import { useLiveCssFiles } from "@/components/Editor/useLiveCssFiles";
import { useLiveFileContent } from "@/context/useFileContents";
import { Workspace } from "@/data/Workspace";
import { TemplateManager } from "@/features/templating";
import { stripFrontmatter } from "@/lib/markdown/frontMatter";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import { AbsPath, isEjs, isHtml, isImage, isMarkdown, isMustache } from "@/lib/paths2";
import { useEffect, useRef, useState } from "react";
import { createRoot, Root } from "react-dom/client";
import { ScrollSyncEmitter } from "./PreviewComponent2";

// Common interface for both iframe and window contexts
export interface PreviewContext {
  document: Document;
  window: Window;
  rootElement: HTMLElement;
}

// Interface for context providers (iframe vs window)
export interface PreviewContextProvider {
  getContext(): PreviewContext | null;
  isReady(): boolean;
  cleanup(): void;
}

// Shared document initialization
export function initializePreviewDocument(doc: Document, title: string = "Preview"): void {
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif;">
        <div id="preview-root"></div>
      </body>
    </html>
  `);
  doc.close();
}

// Shared CSS injection logic
export function injectCssFiles(context: PreviewContext, cssFiles: string[]): void {
  const head = context.document.head;
  
  // Remove existing preview CSS
  const existingLinks = head.querySelectorAll('link[data-preview-css="true"]');
  existingLinks.forEach((link) => link.remove());

  // Add new CSS files
  cssFiles.forEach((cssFile) => {
    const link = context.document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssFile;
    link.setAttribute("data-preview-css", "true");
    head.appendChild(link);
  });
}

// Shared scroll sync setup
export function usePreviewScrollSync(
  scrollEmitter: ScrollSyncEmitter | undefined,
  context: PreviewContext | null,
  originPrefix: string
) {
  const isScrollingRef = useRef(false);
  const originId = useRef(`${originPrefix}-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (!scrollEmitter || !context) return;

    const { document: doc, window: win } = context;
    const scrollElement = doc.documentElement;

    // Listen for scroll events from other components
    const unsubscribe = scrollEmitter.onScroll(async (relX, relY, sourceOriginId) => {
      if (sourceOriginId === originId.current || isScrollingRef.current) return;
      
      const maxScrollLeft = scrollElement.scrollWidth - scrollElement.clientWidth;
      const maxScrollTop = scrollElement.scrollHeight - scrollElement.clientHeight;
      const scrollLeft = relX * maxScrollLeft;
      const scrollTop = relY * maxScrollTop;
      
      isScrollingRef.current = true;
      
      const scrollPromise = new Promise<void>((resolve) => {
        const handleScrollComplete = () => {
          doc.removeEventListener('scroll', handleScrollComplete);
          resolve();
        };
        doc.addEventListener('scroll', handleScrollComplete, { passive: true, once: true });
      });
      
      win.scrollTo(scrollLeft, scrollTop);
      await scrollPromise;
      
      isScrollingRef.current = false;
    });

    // Send our scroll events to other components
    const handleScroll = () => {
      if (isScrollingRef.current) return;
      
      const maxScrollLeft = scrollElement.scrollWidth - scrollElement.clientWidth;
      const maxScrollTop = scrollElement.scrollHeight - scrollElement.clientHeight;
      const relX = maxScrollLeft > 0 ? win.scrollX / maxScrollLeft : 0;
      const relY = maxScrollTop > 0 ? win.scrollY / maxScrollTop : 0;
      
      scrollEmitter.emitScroll(relX, relY, originId.current);
    };

    doc.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      unsubscribe();
      doc.removeEventListener('scroll', handleScroll);
    };
  }, [scrollEmitter, context, originPrefix]);
}

// Shared React mounting logic
export function usePreviewRenderer(
  contextProvider: PreviewContextProvider,
  path: AbsPath | null,
  currentWorkspace: Workspace | null,
  scrollEmitter?: ScrollSyncEmitter
) {
  const reactRootRef = useRef<Root | null>(null);

  useEffect(() => {
    if (!contextProvider.isReady() || !path || !currentWorkspace) return;

    const context = contextProvider.getContext();
    if (!context) return;

    // Clean up previous root
    if (reactRootRef.current) {
      try {
        reactRootRef.current.unmount();
      } catch (error) {
        console.warn('Error unmounting previous React root:', error);
      }
    }

    // Create new React root
    const root = createRoot(context.rootElement);
    reactRootRef.current = root;

    // Render content
    root.render(
      <PreviewContent 
        path={path} 
        currentWorkspace={currentWorkspace}
        scrollEmitter={scrollEmitter}
        context={context}
      />
    );

    return () => {
      // Cleanup handled by context provider
    };
  }, [contextProvider, path, currentWorkspace, scrollEmitter]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reactRootRef.current) {
        try {
          reactRootRef.current.unmount();
        } catch (error) {
          console.warn('Error unmounting React root on cleanup:', error);
        }
        reactRootRef.current = null;
      }
    };
  }, []);

  return reactRootRef;
}

// Shared content rendering component
interface PreviewContentProps {
  path: AbsPath;
  currentWorkspace: Workspace;
  scrollEmitter?: ScrollSyncEmitter;
  context: PreviewContext;
}

export function PreviewContent({ path, currentWorkspace, scrollEmitter, context }: PreviewContentProps) {
  if (isMarkdown(path)) {
    return <MarkdownRenderer path={path} currentWorkspace={currentWorkspace} scrollEmitter={scrollEmitter} context={context} />;
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

// Shared renderer components
function MarkdownRenderer({ 
  path, 
  currentWorkspace, 
  scrollEmitter, 
  context 
}: { 
  path: AbsPath; 
  currentWorkspace: Workspace; 
  scrollEmitter?: ScrollSyncEmitter; 
  context: PreviewContext; 
}) {
  const content = useLiveFileContent(currentWorkspace, path);
  const [html, setHtml] = useState<string>("");
  
  usePreviewScrollSync(scrollEmitter, context, "markdown");

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

// Shared preview logic hook that combines everything
export function usePreviewLogic(
  contextProvider: PreviewContextProvider,
  path: AbsPath | null,
  currentWorkspace: Workspace | null,
  scrollEmitter?: ScrollSyncEmitter
) {
  // Get CSS files in parent context
  const cssFiles = useLiveCssFiles({ 
    path, 
    currentWorkspace
  });
  
  // Setup React rendering
  const reactRootRef = usePreviewRenderer(contextProvider, path, currentWorkspace, scrollEmitter);
  
  // Inject CSS when ready
  useEffect(() => {
    if (!contextProvider.isReady()) return;
    
    const context = contextProvider.getContext();
    if (context) {
      injectCssFiles(context, cssFiles);
    }
  }, [contextProvider, cssFiles]);

  return { reactRootRef };
}