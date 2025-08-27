import { Links } from "@/app/Links";
import { useRenamePathAdjuster } from "@/app/useRenamePathAdjuster";
import { useLiveCssFiles } from "@/components/Editor/useLiveCssFiles";
import { ScrollSyncProvider, useScrollChannel, useScrollSync } from "@/components/ScrollSync";
import { useFileContents } from "@/context/useFileContents";
import { useWorkspaceContext, useWorkspaceRoute } from "@/context/WorkspaceContext";
import { WorkspaceProvider } from "@/context/WorkspaceProvider";
import { stripFrontmatter } from "@/lib/markdown/frontMatter";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import { AbsPath, isImage, isMarkdown } from "@/lib/paths2";
import { useRouter, useSearch } from "@tanstack/react-router";
// import "github-markdown-css/github-markdown-light.css";
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
  // const { isCssFile } = useCurrentFilepath();
  const { sessionId } = useSearch({
    strict: false,
  }) as { sessionId: string };
  const { currentWorkspace } = useWorkspaceContext();
  const router = useRouter();

  useRenamePathAdjuster({ path, currentWorkspace });

  useEffect(() => {
    //TODO this should just be a reusable hook somewhere
    return currentWorkspace.renameListener((details) => {
      const pathRename = details.find(({ oldPath }) => oldPath === path);
      if (pathRename) {
        router.history.replace(
          window.location.pathname.replace(pathRename.oldPath, pathRename.newPath) + window.location.search
        );
      }
    });
  }, [currentWorkspace, path, router]);

  const cssFiles = useLiveCssFiles({ path, currentWorkspace });

  const { scrollEmitter } = useScrollChannel({ sessionId });
  if (!path) return null;

  if (isMarkdown(path)) {
    return (
      <>
        <ScrollSyncProvider scrollEmitter={scrollEmitter}>
          <Links hrefs={cssFiles} />
          <MarkdownRender path={path} />
        </ScrollSyncProvider>
      </>
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

function MarkdownRender({ path }: { path: AbsPath | null }) {
  const [contents, setContents] = useState<string | null>(null);
  const { currentWorkspace } = useWorkspaceContext();
  const { initialContents } = useFileContents({
    currentWorkspace,
    path,
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
      ref={scrollRef as RefObject<HTMLDivElement>}
      className="pt-4 bg-inherit flex justify-center mt-12 w-full  p-4 m-0 h-[calc(100vh-48px)] overflow-y-scroll"
    >
      <div className="_prose" dangerouslySetInnerHTML={{ __html: html }}></div>
    </div>
  );
}
