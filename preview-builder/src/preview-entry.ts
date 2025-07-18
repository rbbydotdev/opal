// Import local dependencies
import { snapdom } from "@zumer/snapdom";
// import "github-markdown-css/github-markdown-light.css";

// Import your project's internal modules
import {
  NewIframeErrorMessagePayload,
  NewIframeImageMessagePayload,
} from "@/app/(preview)/editview/[...editviewPath]/IframeImageMessagePayload";
import { HistoryDAO } from "@/Db/HistoryDAO";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";

// The rest of the logic remains the same, but is now fully type-safe

function broadcastError(error: Error) {
  console.error("Broadcasting error to parent:", error);
  window.parent.postMessage(NewIframeErrorMessagePayload(error), "*");
}

window.onerror = (message, _source, _lineno, _colno, error) => {
  broadcastError(error || new Error(message as string));
  return true;
};

async function snapshotAndPost(target: HTMLElement, editId: number) {
  const images = Array.from(target.querySelectorAll("img"));
  if (images.length > 0) {
    await Promise.all(
      images.map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete) return resolve(true);
            img.addEventListener("load", () => resolve(true), { once: true });
            img.addEventListener("error", () => resolve(true), { once: true });
          })
      )
    );
  }

  const capture = await snapdom.capture(target);
  const canvas = await capture.toCanvas();
  const blob: Blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b as Blob), "image/webp");
  });

  window.parent.postMessage(NewIframeImageMessagePayload(blob, editId));
}

async function main() {
  await navigator.serviceWorker.ready;
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const editIdStr = searchParams.get("editId");
    if (!editIdStr) throw new Error("Missing editId in URL.");
    const editId = parseInt(editIdStr, 10);

    const history = new HistoryDAO();
    const change = await history.getEditByEditId(editId);
    if (!change) throw new Error(`No document change found for editId: ${editId}`);
    const markdownContent = (await history.reconstructDocumentFromEdit(change)) ?? "";
    history.tearDown();

    const html = renderMarkdownToHtml(markdownContent);
    const target = document.getElementById("render-target");
    if (!target) throw new Error("Render target element not found.");
    target.innerHTML = html;

    await snapshotAndPost(target, editId);
  } catch (error) {
    broadcastError(error as Error);
  }
}

void main();
