"use client";
import { HistoryDB } from "@/components/Editor/history/HistoryDB";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorPlaque } from "@/components/ErrorPlaque";
import { useWorkspaceRoute } from "@/context/WorkspaceHooks";
import { WorkspaceProvider } from "@/context/WorkspaceProvider";
import { useErrorToss } from "@/lib/errorToss";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import { isMarkdown } from "@/lib/paths2";
import { snapdom } from "@zumer/snapdom";
import "github-markdown-css/github-markdown-light.css";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export default function Page({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const { path } = useWorkspaceRoute();
  // console.log({ path });
  if (!isMarkdown(path ?? "")) {
    return <div>editview is only available for markdown files.</div>;
  }
  if (editId === null) return <div>Missing editId</div>;

  return (
    <>
      <div className="min-w-0 h-full flex w-full">
        <div className="flex-1 overflow-hidden">
          <WorkspaceProvider>
            {/* Example usage: <div>Session ID: {sessionId}</div> */}
            <ErrorBoundary fallback={<ErrorPlaque />}>
              <PreviewComponent editId={parseInt(editId)} />
            </ErrorBoundary>
            {children}
          </WorkspaceProvider>
        </div>
      </div>
    </>
  );
}

function PreviewComponent({ editId }: { editId: number }) {
  const toss = useErrorToss();
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    void (async () => {
      const history = new HistoryDB();
      const documentChange = await history.getEditByEditId(editId);
      if (documentChange === null) {
        return toss(new Error(`No document change found for editId: ${editId}`));
      }
      setEditContent((await history.reconstructDocumentFromEdit(documentChange)) ?? "");
    })();
  }, [editId, toss]);

  return <MarkdownRender contents={editContent} />;
}

function MarkdownRender({ contents }: { contents?: string | null }) {
  const html = useMemo(() => renderMarkdownToHtml(contents ?? ""), [contents]);
  const htmlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = htmlRef.current;
    if (!target) return;

    // Callback for mutation observer
    const handleMutations = async () => {
      const capture = await snapdom.capture(target);
      //@ts-ignore
      const blob = await capture.toBlob({
        type: "webp",
      });
      window.parent.postMessage({ type: "BLOB_RESULT", blob }, "*");
    };

    const observer = new MutationObserver(handleMutations);
    observer.observe(target, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
    };
  }, [html]);

  return (
    <div>
      <div
        className="markdown-editview"
        ref={htmlRef}
        style={{ padding: "32px" }}
        dangerouslySetInnerHTML={{ __html: html }}
      ></div>
    </div>
  );
}
