// Import local dependencies
import { snapdom } from "@zumer/snapdom";
// import "github-markdown-css/github-markdown-light.css";

// Import your project's internal modules
import {
  NewIframeErrorMessagePayload,
  NewIframeImageMessagePayload,
  NewIframeReadyPayload,
  isIframeNewImageMessage,
} from "@/app/(preview)/editview/[...editviewPath]/IframeImageMessagePayload";
import { HistoryDAO } from "@/Db/HistoryDAO";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";

// --- UTILITY FUNCTIONS ---

function broadcastError(error: Error) {
  console.error("Broadcasting error to parent:", error);
  window.parent.postMessage(NewIframeErrorMessagePayload(error), "*");
}

window.onerror = (message, _source, _lineno, _colno, error) => {
  broadcastError(error || new Error(message as string));
  return true;
};

// --- CORE LOGIC (Used by both initial load and updates) ---

async function snapshotAndPost(target: HTMLElement, editId: number) {
  // ... (snapshot logic remains unchanged)
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

async function renderAndSnapshot(editId: number) {
  try {
    const history = new HistoryDAO();
    const change = await history.getEditByEditId(editId);
    if (!change) {
      throw new Error(`No document change found for editId: ${editId}`);
    }
    const markdownContent = (await history.reconstructDocumentFromEdit(change)) ?? "";
    history.tearDown();

    const html = renderMarkdownToHtml(markdownContent);
    const target = document.getElementById("render-target");
    if (!target) {
      throw new Error("Render target element not found.");
    }
    target.innerHTML = html;

    await snapshotAndPost(target, editId);
  } catch (error) {
    broadcastError(error as Error);
  }
}

// --- PHASE 1: LISTEN FOR SUBSEQUENT UPDATES VIA POSTMESSAGE ---
// This listener is set up immediately and waits for messages from the parent.
// It does not block the initial load.
window.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (isIframeNewImageMessage(event)) {
    console.log(`Received new editId via postMessage: ${event.data.editId}`);
    void renderAndSnapshot(event.data.editId);
  }
});

// --- PHASE 2: HANDLE INITIAL LOAD FROM URL ---
// This function runs once when the script is first executed.
async function main() {
  await navigator.serviceWorker.ready;
  try {
    // It checks the URL for an `editId`.
    const searchParams = new URLSearchParams(window.location.search);
    const editIdStr = searchParams.get("editId");

    // If an `editId` is found, it renders that version.
    if (editIdStr) {
      console.log(`Initializing with editId from URL: ${editIdStr}`);
      const editId = parseInt(editIdStr, 10);
      await renderAndSnapshot(editId);
    } else {
      window.parent.postMessage(NewIframeReadyPayload(), "*");
      // If no `editId` is in the URL, it simply waits for a postMessage.
      console.log("Iframe ready, awaiting editId via postMessage.");
    }
  } catch (error) {
    broadcastError(error as Error);
  }
}

// Kicks off the initial load process.
void main();
