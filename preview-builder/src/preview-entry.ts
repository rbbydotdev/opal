"use client";
import { HistoryDAO } from "@/Db/HistoryDAO";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import { snapdom } from "@zumer/snapdom";
import * as Comlink from "comlink";
import "github-markdown-css/github-markdown-light.css";

async function snapshotAndPost(target: HTMLElement) {
  // ... (snapshot logic remains unchanged)
  const images = Array.from(target.querySelectorAll("img"));
  if (images.length > 0) {
    await Promise.all(
      images.map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete) return resolve(true);
            const onDone = () => resolve(true);
            img.addEventListener("load", onDone, { once: true });
            img.addEventListener("error", onDone, { once: true });
            // Timeout fallback (e.g., 2 seconds)
            setTimeout(onDone, 2000);
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
}

const PreviewWorkerApi = {
  async renderFromMarkdownAndSnapshot(markdownContent: string) {
    const html = renderMarkdownToHtml(markdownContent);
    const target = document.getElementById("render-target");
    if (!target) {
      throw new Error("Render target element not found.");
    }
    target.innerHTML = html;

    return await snapshotAndPost(target);
  },
  async renderAndSnapshot(editId: number) {
    const history = new HistoryDAO();
    const change = await history.getEditByEditId(editId);
    if (!change) {
      throw new Error(`No document change found for editId: ${editId}`);
    }
    const markdownContent = (await history.reconstructDocumentFromEdit(change)) ?? "";

    const html = renderMarkdownToHtml(markdownContent);
    const target = document.getElementById("render-target");
    if (!target) {
      throw new Error("Render target element not found.");
    }
    target.innerHTML = html;

    const result = await snapshotAndPost(target);

    await history.updatePreviewForEditId(editId, result);

    history.tearDown();

    return result;
  },
} satisfies PreviewWorkerApi;

Comlink.expose(PreviewWorkerApi, Comlink.windowEndpoint(self.parent));
