import { ScrollSyncProvider, useScrollChannel, useScrollSync } from "@/components/ScrollSync";
import { useFileContents } from "@/context/useFileContents";
import { useWorkspaceContext, useWorkspaceRoute } from "@/context/WorkspaceContext";
import { WorkspaceProvider } from "@/context/WorkspaceProvider";
import { stripFrontmatter } from "@/lib/markdown/frontMatter";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import { isImage, isMarkdown } from "@/lib/paths2";
import { useRouter, useSearch } from "@tanstack/react-router";
import "github-markdown-css/github-markdown-light.css";
import { RefObject, useEffect, useMemo, useState } from "react";

export function PreviewComponent() {
  return (
    <WorkspaceProvider>
      <div className="flex justify-center items-center w-full h-full m-auto">
        <PreviewComponentInternal />
      </div>
    </WorkspaceProvider>
  );
}

function PreviewComponentInternal() {
  const { path } = useWorkspaceRoute();
  const { sessionId } = useSearch({
    strict: false,
  }) as { sessionId: string };
  const { currentWorkspace } = useWorkspaceContext();
  const router = useRouter();
  useEffect(() => {
    //TODO this should just be a reusable hook somewhere
    currentWorkspace.renameListener((details) => {
      const pathRename = details.find(({ oldPath }) => oldPath === path);
      if (pathRename) {
        router.history.replace(
          window.location.pathname.replace(pathRename.oldPath, pathRename.newPath) + window.location.search
        );
      }
    });
  }, [currentWorkspace, path, router]);

  // const sessionId = searchParams.get("sessionId") ?? "UNKNOWN_SESSION_ID";
  const { scrollEmitter } = useScrollChannel({ sessionId });
  if (!path) return null;
  if (isMarkdown(path)) {
    return (
      <ScrollSyncProvider scrollEmitter={scrollEmitter}>
        <MarkdownRender />
      </ScrollSyncProvider>
    );
  }
  if (isImage(path)) {
    return <ImageRender />;
  }
  return (
    <div>
      <p>Unsupported file type for preview: {path}</p>
    </div>
  );
}
function ImageRender() {
  const { path } = useWorkspaceRoute();
  if (!path) return null;
  return (
    <div>
      <img src={path} alt="Preview" />
    </div>
  );
}

function MarkdownRender() {
  const [contents, setContents] = useState<string | null>(null);
  const { currentWorkspace } = useWorkspaceContext();
  const { initialContents } = useFileContents({
    currentWorkspace,
    listenerCb: (contents) => {
      setContents(stripFrontmatter(String(contents)));
    },
  });
  const html = useMemo(
    () => renderMarkdownToHtml(stripFrontmatter(contents === null ? String(initialContents ?? "") : (contents ?? ""))),
    [contents, initialContents]
  );
  const { scrollRef } = useScrollSync();
  return (
    <div
      className="mt-[10px] w-full border-[2px] rounded shadow-lg  p-4 m-0 h-[calc(100vh-20px)] overflow-y-scroll"
      ref={scrollRef as RefObject<HTMLDivElement>}
    >
      <div className="prose markdown-body" dangerouslySetInnerHTML={{ __html: html }}></div>
    </div>
  );
}
