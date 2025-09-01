import { Links } from "@/app/Links";
import { useRenamePathAdjuster } from "@/app/useRenamePathAdjuster";
import { useLiveCssFiles } from "@/components/Editor/useLiveCssFiles";
import { ScrollSyncProvider, useScrollChannel, useScrollSync } from "@/components/ScrollSync";
import { useFileContents } from "@/context/useFileContents";
import { useWorkspaceContext, useWorkspaceRoute, WorkspaceProvider } from "@/context/WorkspaceContext";
import { stripFrontmatter } from "@/lib/markdown/frontMatter";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import { AbsPath, isImage, isMarkdown } from "@/lib/paths2";
import { useSearch } from "@tanstack/react-router";
// import "github-markdown-css/github-markdown-light.css";
import { RefObject, useMemo, useState } from "react";

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

  useRenamePathAdjuster({ path, currentWorkspace });

  // const router = useRouter();
  // useEffect(() => {
  //   //TODO this should just be a reusable hook somewhere
  //   return currentWorkspace.renameListener((details) => {
  //     const pathRename = details.find(({ oldPath }) => oldPath === path);
  //     if (pathRename) {
  //       router.history.replace(
  //         window.location.pathname.replace(pathRename.oldPath, pathRename.newPath) + window.location.search
  //       );
  //     }
  //   });
  // }, [currentWorkspace, path, router]);

  const cssFiles = useLiveCssFiles({ path, currentWorkspace });

  const { scrollEmitter } = useScrollChannel({ sessionId });
  if (!path) return null;

  if (isMarkdown(path)) {
    return (
      <div className="absolute inset-0">
        <ScrollSyncProvider scrollEmitter={scrollEmitter}>
          <Links hrefs={cssFiles} />
          <MarkdownRender path={path} />
        </ScrollSyncProvider>
      </div>
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
  const { scrollRef } = useScrollSync();
  // useSidebarPanes({ registerKeyboardListeners: window.self !== window.top });
  return (
    <div
      ref={scrollRef as RefObject<HTMLDivElement>}
      className="pt-4 bg-inherit flex justify-center _mt-12 w-full  p-4 m-0 h-[calc(100vh-48px)] overflow-y-scroll"
    >
      <div dangerouslySetInnerHTML={{ __html: html }}></div>
    </div>
  );
}
