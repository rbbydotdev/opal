"use client";
import { useFileContents, useWorkspaceRoute } from "@/context/WorkspaceHooks";
import { WorkspaceProvider } from "@/context/WorkspaceProvider";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import { isImage, isMarkdown } from "@/lib/paths2";
import "github-markdown-css/github-markdown.css";
import { useMemo, useState } from "react";

export default function Page({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="min-w-0 h-full flex w-full">
        <div className="flex-1 overflow-hidden">
          <WorkspaceProvider>
            <PreviewComponent />
            {children}
          </WorkspaceProvider>
        </div>
      </div>
    </>
  );
}

function PreviewComponent() {
  // const { currentWorkspace } = useWorkspaceContext();
  const { path } = useWorkspaceRoute();
  if (!path) return null;
  if (isMarkdown(path)) {
    return <MarkdownRender />;
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
  const { initialContents } = useFileContents((contents) => {
    setContents(String(contents));
  });
  const html = useMemo(
    () => renderMarkdownToHtml(contents === null ? String(initialContents ?? "") : contents ?? ""),
    [contents, initialContents]
  );
  return (
    <div>
      <div className="" style={{ padding: "32px" }} dangerouslySetInnerHTML={{ __html: html }}></div>
    </div>
  );
}
