import { HistoryDAO } from "@/Db/HistoryDAO";
import { stripFrontmatter } from "@/lib/markdown/frontMatter";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import { snapdom } from "@zumer/snapdom";
import * as Comlink from "comlink";
import "github-markdown-css/github-markdown-light.css";

// Fast image loading with reduced timeout
async function loadImagesOptimized(images: HTMLImageElement[]) {
  const promises = images.map((img) =>
    Promise.race([
      new Promise<boolean>((resolve) => {
        if (img.complete) return resolve(true);
        const onDone = () => resolve(true);
        img.addEventListener("load", onDone, { once: true });
        img.addEventListener("error", onDone, { once: true });
      }),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 500)), // Reduced from 2000ms
    ])
  );
  await Promise.allSettled(promises); // Don't wait for failures
}

// Chunked canvas processing to avoid blocking
async function processCanvasChunked(sourceCanvas: HTMLCanvasElement, scale: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve) => {
    const scaledCanvas = document.createElement("canvas");
    scaledCanvas.width = sourceCanvas.width * scale;
    scaledCanvas.height = sourceCanvas.height * scale;
    const ctx = scaledCanvas.getContext("2d");

    if (!ctx) {
      resolve(scaledCanvas);
      return;
    }

    // Use requestAnimationFrame to avoid blocking
    requestAnimationFrame(() => {
      ctx.drawImage(sourceCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
      resolve(scaledCanvas);
    });
  });
}

async function snapshot(target: HTMLElement) {
  const perfStart = performance.now();
  console.debug("[iframe] Starting snapshot process");

  // Optimized image loading
  const images = Array.from(target.querySelectorAll("img"));
  if (images.length > 0) {
    const imageStart = performance.now();
    await loadImagesOptimized(images);
    console.debug(`[iframe] Images loaded in ${performance.now() - imageStart}ms`);
  }

  // Snapdom capture with fast mode
  const captureStart = performance.now();
  const capture = await snapdom.capture(target, {
    fast: true, // Enable fast mode
    scale: 1, // Avoid internal scaling
  });
  console.debug(`[iframe] Snapdom capture took ${performance.now() - captureStart}ms`);

  // Canvas processing
  const canvasStart = performance.now();
  const sourceCanvas = await capture.toCanvas();
  console.debug(`[iframe] Canvas creation took ${performance.now() - canvasStart}ms`);

  // Chunked scaling
  const scaleStart = performance.now();
  const scale = parseFloat((1 / 1).toFixed(4));
  const scaledCanvas = await processCanvasChunked(sourceCanvas, scale);
  console.debug(`[iframe] Canvas scaling took ${performance.now() - scaleStart}ms`);

  // Blob creation
  const blobStart = performance.now();
  const blob: Blob = await new Promise((resolve) => {
    scaledCanvas.toBlob((b) => resolve(b as Blob), "image/webp", 0.8);
  });
  console.debug(`[iframe] Blob creation took ${performance.now() - blobStart}ms`);

  const totalTime = performance.now() - perfStart;
  console.debug(`[iframe] Total snapshot time: ${totalTime}ms, blob size: ${blob.size} bytes`);

  return blob;
}

export type PreviewWorkerApiType = typeof PreviewWorkerApi;

const PreviewWorkerApi = {
  async renderFromMarkdownAndSnapshot(markdownContent: string) {
    const html = renderMarkdownToHtml(stripFrontmatter(markdownContent));
    const target = document.getElementById("render-target");
    if (!target) {
      throw new Error("Render target element not found.");
    }
    target.innerHTML = html;

    return await snapshot(target);
  },
  async renderAndSnapshot(editId: number) {
    const history = new HistoryDAO();
    const change = await history.getEditByEditId(editId);
    if (!change) {
      throw new Error(`No document change found for editId: ${editId}`);
    }

    if (change.preview !== null) {
      history.tearDown();
      return change.preview;
    }
    const markdownContent = (await history.reconstructDocumentFromEdit(change)) ?? "";

    const html = renderMarkdownToHtml(markdownContent);
    const target = document.getElementById("render-target");
    if (!target) {
      throw new Error("Render target element not found.");
    }
    target.innerHTML = html;

    const result = await snapshot(target);

    await history.updatePreviewForEditId(editId, result);

    history.tearDown();

    return result;
  },
};

Comlink.expose(PreviewWorkerApi, Comlink.windowEndpoint(self.parent));
