"use client";
import {
  NewIframeErrorMessagePayload,
  NewIframeImageMessagePayload,
} from "@/app/(preview)/editview/[...editviewPath]/IframeImageMessagePayload";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorPlaque } from "@/components/ErrorPlaque";
import { useWorkspaceContext, useWorkspaceRoute } from "@/context/WorkspaceHooks";
import { WorkspaceProvider } from "@/context/WorkspaceProvider";
import { HistoryDAO } from "@/Db/HistoryDAO";
import { useErrorToss } from "@/lib/errorToss";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import { isMarkdown } from "@/lib/paths2";
import { snapdom } from "@zumer/snapdom";
import "github-markdown-css/github-markdown-light.css";
import { useSearchParams } from "next/navigation";
import { cache, use, useEffect, useMemo, useRef, useState } from "react";

function PageComponent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const { path } = useWorkspaceRoute();
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
const getEdit = cache(async (editId: string | number) => {
  const history = new HistoryDAO();
  const documentChange = await history.getEditByEditId(parseInt(String(editId)));

  if (documentChange === null) {
    throw new Error(`No document change found for editId: ${editId}`);
  }
  history.tearDown();
  return documentChange;
});

function PreviewComponent({ editId }: { editId: number }) {
  const toss = useErrorToss();
  const [editContent, setEditContent] = useState("");
  const { currentWorkspace } = useWorkspaceContext();
  // const [documentChange, setDocumentChange] = useState<DocumentChange | null>(null);
  const documentChange = use(getEdit(editId));
  // useEffect(() => {
  //   void (async () => {
  //     try {
  //       const history = new HistoryDAO();
  //       const change = await history.getEditByEditId(editId);
  //       if (change === null) {
  //         return toss(new Error(`No document change found for editId: ${editId}`));
  //       }
  //       setDocumentChange(change);
  //     } catch (error) {
  //       toss(error as Error);
  //     }
  //   })();
  // }, []);

  // useEffect(() => {
  //   void (async () => {
  //     try {
  //       // const history = new HistoryDAO();
  //       // const documentChange = await history.getEditByEditId(editId);
  //       // setEditContent((await history.reconstructDocumentFromEdit(documentChange)) ?? "");
  //       void currentWorkspace?.tearDown();
  //     } catch (error) {
  //       toss(error as Error);
  //     }
  //   })();
  // }, [currentWorkspace, editId, toss]);

  return <MarkdownRender contents={editContent} editId={editId} />;
}

function MarkdownRender({ contents, editId }: { contents?: string | null; editId?: number }) {
  const toss = useErrorToss();
  const html = useMemo(() => {
    try {
      return renderMarkdownToHtml(contents ?? "");
    } catch (e) {
      throw toss(new Error(`Error rendering markdown: ${e}`));
    }
  }, [contents, toss]);
  const htmlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const target = htmlRef.current;
      if (!target) return;

      // Callback for mutation observer
      const handleMutations = async () => {
        // const windowLocation = window.location.href;
        // window.parent.postMessage(NewIframeImageDebugPayload(windowLocation + ":" + editId + " : " + target.innerHTML));
        const capture = await snapdom.capture(target);
        const blob = await capture.toBlob({ format: "webp" });
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
          await new Promise((rs) => setTimeout(rs, 1000));
        }

        window.parent.postMessage(NewIframeImageMessagePayload(blob, editId!));
      };

      // const observer = new MutationObserver(handleMutations);
      // observer.observe(target, { childList: true, subtree: true, characterData: true });
      // return () => {
      //   observer.disconnect();
      // };
      if (html) {
        handleMutations().catch((e) => {
          console.error("Error in mutation observer:", e);
          toss(new Error(`Error in mutation observer: ${e}`));
        });
      }
    } catch (e) {
      throw toss(new Error(`Error setting up mutation observer: ${e}`));
    }
  }, [editId, html, toss]);

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
