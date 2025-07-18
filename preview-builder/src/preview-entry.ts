"use client";
import { snapdom } from "@zumer/snapdom";
// import "github-markdown-css/github-markdown-light.css";
import { HistoryDAO } from "@/Db/HistoryDAO";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import * as Comlink from "comlink";

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
  return { blob, editId };
}

const PreviewWorkerApi = {
  async renderAndSnapshot(editId: number) {
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

    return snapshotAndPost(target, editId);
  },
} satisfies PreviewWorkerApi;

Comlink.expose(PreviewWorkerApi, Comlink.windowEndpoint(self.parent));
