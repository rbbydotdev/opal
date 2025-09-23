import { Links } from "@/app/Links";
import { useRenamePathAdjuster } from "@/app/useRenamePathAdjuster";
import { useLiveCssFiles } from "@/components/Editor/useLiveCssFiles";
import { ScrollSyncProvider, useScrollChannel } from "@/components/ScrollSync";
import { useFileContents } from "@/context/useFileContents";
import { useWorkspaceContext, useWorkspaceRoute, WorkspaceProvider } from "@/context/WorkspaceContext";
import { useWatchElement } from "@/hooks/useWatchElement";
import { stripFrontmatter } from "@/lib/markdown/frontMatter";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import { AbsPath, isImage, isMarkdown } from "@/lib/paths2";
import { useSearch } from "@tanstack/react-router";
// import "github-markdown-css/github-markdown-light.css";
import { useMemo, useState } from "react";

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

  const scrollEl = useWatchElement<HTMLElement>("#markdown");

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
      setContents(stripFrontmatter(String(contents)));
    },
  });
  const html = useMemo(
    () => renderMarkdownToHtml(stripFrontmatter(contents === null ? String(initialContents ?? "") : (contents ?? ""))),
    [contents, initialContents]
  );
  return (
    <div
      id="markdown"
      className="w-full h-full absolute inset-0  overflow-y-auto px-4"
      dangerouslySetInnerHTML={{ __html: html }}
    ></div>
  );
}
