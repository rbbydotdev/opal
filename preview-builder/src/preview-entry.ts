"use client";
import { HistoryDAO } from "@/Db/HistoryDAO";
import { stripFrontmatter } from "@/lib/markdown/frontMatter";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import { snapdom } from "@zumer/snapdom";
import * as Comlink from "comlink";
import "github-markdown-css/github-markdown-light.css";

async function snapshot(target: HTMLElement) {
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
            setTimeout(onDone, 2000);
          })
      )
    );
  }

  const capture = await snapdom.capture(target, {});
  const canvas = await capture.toCanvas();

  const scale = parseFloat((1 / 1).toFixed(4));
  const scaledCanvas = document.createElement("canvas");
  scaledCanvas.width = canvas.width * scale;
  scaledCanvas.height = canvas.height * scale;
  const ctx = scaledCanvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
  }

  const blob: Blob = await new Promise((resolve) => {
    scaledCanvas.toBlob((b) => resolve(b as Blob), "image/webp", 0.8);
  });
  return blob;
}

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
} satisfies PreviewWorkerApi;

Comlink.expose(PreviewWorkerApi, Comlink.windowEndpoint(self.parent));
