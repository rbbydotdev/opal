"use client";
import { useFileContents, useWorkspaceRoute } from "@/context/WorkspaceHooks";
import { WorkspaceProvider } from "@/context/WorkspaceProvider";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import { isImage, isMarkdown } from "@/lib/paths2";
import "github-markdown-css/github-markdown-light.css";
import { useMemo, useState } from "react";

export default function Page({ children }: { children: React.ReactNode }) {
  // const searchParams = useSearchParams();
  // const sessionId = searchParams.get("sessionId");

  // You can now use sessionId as needed
  return (
    <>
      <div className="min-w-0 h-full flex w-full">
        <div className="flex-1 overflow-hidden">
          <WorkspaceProvider>
            {/* Example usage: <div>Session ID: {sessionId}</div> */}
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
