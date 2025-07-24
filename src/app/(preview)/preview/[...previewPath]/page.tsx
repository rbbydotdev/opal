"use client";
import { ScrollSyncProvider, useScrollChannel, useScrollSync } from "@/components/ScrollSync";
import { useFileContents, useWorkspaceRoute } from "@/context/WorkspaceHooks";
import { WorkspaceProvider } from "@/context/WorkspaceProvider";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import { isImage, isMarkdown } from "@/lib/paths2";
import "github-markdown-css/github-markdown-light.css";
import { useSearchParams } from "next/navigation";
import { RefObject, useMemo, useState } from "react";

export default function Page({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <PreviewComponent />
      {children}
    </WorkspaceProvider>
  );
}

function PreviewComponent() {
  const { path } = useWorkspaceRoute();
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams.get("sessionId");
  const { scrollEmitter } = useScrollChannel({ sessionId: sessionIdParam });
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
  const { initialContents } = useFileContents((contents) => {
    setContents(String(contents));
  });
  const html = useMemo(
    () => renderMarkdownToHtml(contents === null ? String(initialContents ?? "") : contents ?? ""),
    [contents, initialContents]
  );
  const { scrollRef } = useScrollSync();
  return (
    <div
      style={{
        border: "10px solid black",
        maxWidth: "980px",
        padding: 0,
        margin: 0,
        height: "calc(100vh - 20px)",
        overflowY: "scroll",
      }}
      ref={scrollRef as RefObject<HTMLDivElement>}
    >
      <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }}></div>
    </div>
  );
}

// import { ReactNode, useEffect, useRef } from "react";

// function _ScrollSyncListener({
//   sessionId,
//   children,
// }: {
//   sessionId: string | null;
//   children: (ref: React.RefObject<HTMLDivElement | null>) => ReactNode;
// }) {
//   const containerRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (!sessionId) return;
//     const channel = new BroadcastChannel(sessionId);

//     const handler = (event: MessageEvent) => {
//       const { x, y } = event.data || {};
//       if (typeof x === "number" && typeof y === "number" && containerRef.current) {
//         containerRef.current.scrollTo(x, y);
//       }
//     };

//     channel.addEventListener("message", handler);
//     return () => {
//       channel.removeEventListener("message", handler);
//       channel.close();
//     };
//   }, [sessionId]);

//   return <>{children(containerRef)}</>;
// }
