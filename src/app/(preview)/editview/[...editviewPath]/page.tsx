"use client";
import { NewIframeErrorMessagePayload } from "@/app/(preview)/editview/[...editviewPath]/IframeImageMessagePayload";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorPlaque } from "@/components/ErrorPlaque";
import { WorkspaceProvider } from "@/context/WorkspaceProvider";
import { HistoryDAO } from "@/Db/HistoryDAO";
import { useErrorToss } from "@/lib/errorToss";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import { snapdom } from "@zumer/snapdom";
import "github-markdown-css/github-markdown-light.css";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

function PageComponent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId") ?? "-1";
  // if (editId === null) return <div>Missing editId</div>;

  return (
    <>
      <div className="min-w-0 h-full flex w-full">
        <div className="flex-1 overflow-hidden">
          <WorkspaceProvider>
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

function broadcastError(error: Error) {
  return window.parent.postMessage(NewIframeErrorMessagePayload(error), "*");
}

export default function Page({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary onError={(error) => broadcastError(error)} fallback={null}>
      <PageComponent>{children}</PageComponent>
    </ErrorBoundary>
  );
}

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
  // Wait for all images to load before capturing
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
  // const capture = await snapdom.capture(target);
  // const result = await capture.toWebp();
  // return base64URIToBlob(result.src);

  const capture = await snapdom.capture(target);
  const canvas = await capture.toCanvas();
  const blob: Blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b as Blob), "image/webp");
  });
  return blob;
};

function MarkdownRender({ contents, editId }: { contents?: string | null; editId?: number }) {
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
