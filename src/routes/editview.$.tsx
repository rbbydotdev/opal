import { createFileRoute } from '@tanstack/react-router'
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorPlaque } from "@/components/ErrorPlaque";
import { WorkspaceProvider } from "@/context/WorkspaceProvider";
import { HistoryDAO } from "@/Db/HistoryDAO";
import { useErrorToss } from "@/lib/errorToss";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import { snapdom } from "@zumer/snapdom";
import "github-markdown-css/github-markdown-light.css";
import { useEffect, useMemo, useRef, useState } from "react";

function PreviewComponent({ editId }: { editId: number }) {
  const toss = useErrorToss();
  const [editContent, setEditContent] = useState("");
  useEffect(() => {
    void (async () => {
      try {
        const history = new HistoryDAO();
        const change = editId === -1 ? await history.getLatestEdit("foobar") : await history.getEditByEditId(editId);
        if (change === null) {
          return toss(new Error(`No document change found for editId: ${editId}`));
        }
        setEditContent((await history.reconstructDocumentFromEdit(change)) ?? "");
        history.tearDown();
      } catch (error) {
        toss(error as Error);
      }
    })();
  }, [editId, toss]);

  return <MarkdownRender contents={editContent} editId={editId} />;
}

const handleMutations = async (target: HTMLDivElement) => {
  const images = Array.from(target.querySelectorAll("img"));
  if (images.length > 0) {
    await Promise.all(
      images.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.addEventListener("load", resolve, { once: true });
              img.addEventListener("error", resolve, { once: true });
            })
      )
    );
  }

  const capture = await snapdom.capture(target);
  const canvas = await capture.toCanvas();
  const blob: Blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b as Blob), "image/webp");
  });
  return blob;
};

function MarkdownRender({ contents, editId: _eid }: { contents?: string | null; editId?: number }) {
  const toss = useErrorToss();
  const [src, setSrc] = useState<string | null>(null);
  const html = useMemo(() => {
    try {
      return renderMarkdownToHtml(contents ?? "");
    } catch (e) {
      throw toss(new Error(`Error rendering markdown: ${e}`));
    }
  }, [contents, toss]);
  const htmlRef = useRef<HTMLDivElement>(null);

  const handleClick = async () => {
    const blob = await handleMutations(htmlRef.current!);
    setSrc(URL.createObjectURL(blob));
  };

  return (
    <div>
      <div
        className="markdown-editview"
        ref={htmlRef}
        style={{ padding: "32px" }}
        dangerouslySetInnerHTML={{ __html: html }}
      ></div>
      <button onClick={handleClick} style={{ border: "3px solid purple", padding: "12px" }}>
        RENDER
      </button>
      <div>
        {src !== null ? (
          <img style={{ border: "1px solid black", width: "320px", height: "320px" }} src={src} alt={"preview"} />
        ) : null}
      </div>
    </div>
  );
}

function EditviewPage() {
  const { editId = "-1" } = Route.useSearch();
  
  return (
    <>
      <div className="min-w-0 h-full flex w-full">
        <div className="flex-1 overflow-hidden">
          <WorkspaceProvider>
            <ErrorBoundary fallback={<ErrorPlaque />}>
              <PreviewComponent editId={parseInt(editId)} />
            </ErrorBoundary>
          </WorkspaceProvider>
        </div>
      </div>
    </>
  );
}

export const Route = createFileRoute('/editview/$')({
  component: EditviewPage,
  validateSearch: (search: Record<string, unknown>) => ({
    editId: (search.editId as string) || "-1",
  }),
})