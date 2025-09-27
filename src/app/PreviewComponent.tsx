import { Links } from "@/app/Links";
import { useRenamePathAdjuster } from "@/app/useRenamePathAdjuster";
import { useLiveCssFiles } from "@/components/Editor/useLiveCssFiles";
import { ScrollSyncProvider, useScrollChannel } from "@/components/ScrollSync";
import { useFileContents } from "@/context/useFileContents";
import { useWorkspaceContext, useWorkspaceRoute, WorkspaceProvider } from "@/context/WorkspaceContext";
import { TemplateManager } from "@/features/templating";
import { useWatchElement } from "@/hooks/useWatchElement";
import { stripFrontmatter } from "@/lib/markdown/frontMatter";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import { AbsPath, isEjs, isHtml, isImage, isMarkdown } from "@/lib/paths2";
import { useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export function PreviewComponent() {
  return (
    <WorkspaceProvider>
      <PreviewComponentInternal />
    </WorkspaceProvider>
  );
}

function PreviewComponentInternal() {
  const { path } = useWorkspaceRoute();
  const { sessionId } = useSearch({
    strict: false,
  }) as { sessionId: string };
  const { currentWorkspace } = useWorkspaceContext();

  useRenamePathAdjuster({ path, currentWorkspace });

  const cssFiles = useLiveCssFiles({ path, currentWorkspace });

  const { scrollEmitter } = useScrollChannel({ sessionId });
  if (!path) return null;

  const scrollEl = useWatchElement<HTMLElement>("#render");

  if (isMarkdown(path)) {
    return (
      <ScrollSyncProvider scrollEmitter={scrollEmitter} scrollEl={scrollEl || undefined}>
        <Links hrefs={cssFiles} />
        <MarkdownRender path={path} />
      </ScrollSyncProvider>
    );
  }
  if (isImage(path)) {
    return <ImageRender />;
  }
  if (isEjs(path)) {
    return (
      <ScrollSyncProvider scrollEmitter={scrollEmitter} scrollEl={scrollEl || undefined}>
        <Links hrefs={cssFiles} />
        <EjsRender path={path} />
      </ScrollSyncProvider>
    );
  }
  if (isHtml(path)) {
    return (
      <ScrollSyncProvider scrollEmitter={scrollEmitter} scrollEl={scrollEl || undefined}>
        <Links hrefs={cssFiles} />
        <HtmlRender path={path} />
      </ScrollSyncProvider>
    );
  }
  return <p>Unsupported file type for preview: {path}</p>;
}
function ImageRender() {
  const { path } = useWorkspaceRoute();
  if (!path) return null;
  return <img src={path} alt="Preview" />;
}

function MarkdownRender({ path }: { path: AbsPath | null }) {
  const [contents, setContents] = useState<string | null>(null);
  const { currentWorkspace } = useWorkspaceContext();
  const { contents: initialContents } = useFileContents({
    currentWorkspace,
    path,
    onContentChange: (contents) => {
      setContents(String(contents));
    },
  });
  const html = useMemo(
    () => renderMarkdownToHtml(stripFrontmatter(contents === null ? String(initialContents ?? "") : (contents ?? ""))),
    [contents, initialContents]
  );
  return (
    <div
      id="render"
      className="w-full h-full absolute inset-0  overflow-y-auto px-4"
      dangerouslySetInnerHTML={{ __html: html }}
    ></div>
  );
}
function EjsRender({ path }: { path: AbsPath | null }) {
  const [contents, setContents] = useState<string | null>(null);
  const [html, setHtml] = useState<string>("");
  const { currentWorkspace } = useWorkspaceContext();
  const { contents: initialContents } = useFileContents({
    currentWorkspace,
    path,
    onContentChange: (contents) => {
      setContents(String(contents));
    },
  });

  // Create template manager when workspace is available
  const templateManager = useMemo(() => {
    return currentWorkspace ? new TemplateManager(currentWorkspace) : null;
  }, [currentWorkspace]);

  const finalContents = contents === null ? String(initialContents ?? "") : (contents ?? "");

  // Use effect to handle async rendering
  useEffect(() => {
    if (!templateManager || !finalContents) {
      setHtml("");
      return;
    }

    const renderTemplate = async () => {
      try {
        // Use renderStringWithMarkdown for all templates (handles async automatically)
        const rendered = await templateManager.renderStringWithMarkdown(finalContents, {
          data: {
            title: "Preview",
            name: "User",
          },
        });
        setHtml(rendered);
      } catch (error) {
        console.error("Template render error:", error);
        const err = error as Error;
        const message = err.message || String(err);
        const stack = err.stack || "";
        setHtml(`<div class="text-red-600 p-4 border border-red-300 rounded">
          <div><strong>Template Render Error:</strong> ${message}</div>
          ${stack ? `<pre class="mt-2 whitespace-pre-wrap text-sm">${stack}</pre>` : ""}
        </div>`);
      }
    };

    void renderTemplate();
  }, [templateManager, finalContents]);

  return (
    <div
      id="render"
      className="w-full h-full absolute inset-0  overflow-y-auto px-4"
      dangerouslySetInnerHTML={{ __html: html }}
    ></div>
  );
}

function HtmlRender({ path }: { path: AbsPath | null }) {
  const [contents, setContents] = useState<string | null>(null);
  const { currentWorkspace } = useWorkspaceContext();
  const { contents: initialContents } = useFileContents({
    currentWorkspace,
    path,
    onContentChange: (contents) => {
      setContents(String(contents));
    },
  });

  const finalContents = contents === null ? String(initialContents ?? "") : (contents ?? "");

  return (
    <div
      id="render"
      className="w-full h-full absolute inset-0  overflow-y-auto px-4"
      dangerouslySetInnerHTML={{ __html: finalContents }}
    ></div>
  );
}
