//@ts-nocheck
/**
 * Migration Guide: Iframe Screenshot Pool → Web Worker Pool
 *
 * This shows how to convert your existing iframe-based screenshot system
 * to use web workers while handling the DOM rendering limitations.
 */

import { useState } from "react";
import { useSnapshotWorkerPool } from "./worker-pool/SnapshotWorkerPool";

// ===============================
// CURRENT IFRAME APPROACH
// ===============================

// Your current system (SnapApiPoolProvider.tsx):
/*
export async function createApiResource({ editId, workspaceId }) {
  let iframe = document.createElement("iframe");
  iframe.src = "/doc-preview-image.html?" + searchParams.toString();
  iframe.style.transform = "translate(-9999px, -9999px)";
  iframe.style.position = "absolute";
  document.body.appendChild(iframe);
  await new Promise((rs) => (iframe.onload = () => rs(true)));
  
  let api = Comlink.wrap(Comlink.windowEndpoint(iframe.contentWindow));
  return { api, terminate: () => { iframe.remove(); } };
}
*/

// ===============================
// NEW WEB WORKER APPROACH
// ===============================

// Strategy 1: Hybrid Approach (RECOMMENDED)
// Worker handles data processing, main thread handles DOM rendering
export function useHybridScreenshot() {
  const { cmd } = useSnapshotWorkerPool();

  return async function generateScreenshot(editId: number, workspaceId: string) {
    // Step 1: Worker processes the markdown data
    const markdownContent = await fetchMarkdownForEdit(editId);
    const { processedHtml, metadata, styles } = await cmd.prepareMarkdownData(markdownContent);

    // Step 2: Main thread renders DOM (since workers can't access DOM)
    const screenshot = await renderInMainThread(processedHtml, styles);

    // Step 3: Worker can post-process the image if needed
    // const processedScreenshot = await cmd.processImageData({
    //   imageData: screenshot,
    //   filters: [],
    //   compression: { format: 'webp', quality: 0.8 }
    // });

    return screenshot;
  };
}

// Strategy 2: Service-Based Approach
// Delegate to a headless browser service
export function useServiceScreenshot() {
  const { cmd } = useSnapshotWorkerPool();

  return async function generateScreenshot(editId: number, workspaceId: string) {
    // Worker coordinates with headless browser service
    return await cmd.generateScreenshotFromUrl({
      url: `/api/preview/${workspaceId}/${editId}`,
      viewport: { width: 800, height: 600 },
      options: {
        format: "webp",
        quality: 0.8,
        scale: 1,
      },
    });
  };
}

// ===============================
// MIGRATION COMPARISON
// ===============================

export function MigrationComparison() {
  const [iframeBlob, setIframeBlob] = useState<Blob | null>(null);
  const [workerBlob, setWorkerBlob] = useState<Blob | null>(null);

  const hybridScreenshot = useHybridScreenshot();
  const serviceScreenshot = useServiceScreenshot();

  const compareApproaches = async () => {
    const editId = 123;
    const workspaceId = "test-workspace";

    // Iframe approach (existing)
    const iframeResult = await generateIframeScreenshot(editId, workspaceId);
    setIframeBlob(iframeResult);

    // Worker approach (new)
    const workerResult = await hybridScreenshot(editId, workspaceId);
    setWorkerBlob(workerResult);
  };

  return (
    <div className="space-y-4">
      <button onClick={compareApproaches}>Compare Iframe vs Worker Approaches</button>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3>Iframe Approach (Current)</h3>
          {iframeBlob && <img src={URL.createObjectURL(iframeBlob)} alt="Iframe screenshot" className="border" />}
        </div>

        <div>
          <h3>Worker Approach (New)</h3>
          {workerBlob && <img src={URL.createObjectURL(workerBlob)} alt="Worker screenshot" className="border" />}
        </div>
      </div>
    </div>
  );
}

// ===============================
// HELPER FUNCTIONS
// ===============================

async function fetchMarkdownForEdit(editId: number): Promise<string> {
  // Pseudo: Replace with your actual data fetching
  // const history = new HistoryDAO();
  // const change = await history.getEditByEditId(editId);
  // return await history.reconstructDocumentFromEdit(change) ?? "";

  return "# Sample Markdown\n\nThis is test content.";
}

async function renderInMainThread(html: string, styles: string[]): Promise<Blob> {
  // Create temporary container (similar to your iframe content)
  const container = document.createElement("div");
  container.innerHTML = html;
  container.className = "markdown-body"; // Apply GitHub markdown styles

  // Apply styles
  for (const styleUrl of styles) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = styleUrl;
    document.head.appendChild(link);
  }

  // Position off-screen (like your iframe)
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = "800px";

  document.body.appendChild(container);

  try {
    // Wait for styles and images to load
    await waitForRender(container);

    // Use your existing snapdom logic
    const blob = await captureWithSnapdom(container);

    return blob;
  } finally {
    // Cleanup
    document.body.removeChild(container);
  }
}

async function waitForRender(container: HTMLElement): Promise<void> {
  // Wait for images and fonts to load
  const images = Array.from(container.querySelectorAll("img"));
  const imagePromises = images.map((img) =>
    img.complete
      ? Promise.resolve()
      : new Promise((resolve) => {
          img.onload = img.onerror = () => resolve(undefined);
        })
  );

  await Promise.allSettled(imagePromises);

  // Small delay for fonts and layout
  await new Promise((resolve) => setTimeout(resolve, 100));
}

async function captureWithSnapdom(element: HTMLElement): Promise<Blob> {
  // Use your existing snapdom implementation
  // const { snapdom } = await import('@zumer/snapdom');
  // const capture = await snapdom.capture(element, { fast: true, scale: 1 });
  // const canvas = await capture.toCanvas();
  // return new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.8));

  // Pseudo implementation
  return new Blob(["fake-screenshot"], { type: "image/webp" });
}

async function generateIframeScreenshot(editId: number, workspaceId: string): Promise<Blob> {
  // Your existing iframe implementation
  // This would use your SnapApiPoolProvider system

  // Pseudo implementation
  return new Blob(["iframe-screenshot"], { type: "image/webp" });
}

// ===============================
// PERFORMANCE COMPARISON
// ===============================

export const PERFORMANCE_COMPARISON = {
  iframe: {
    pros: [
      "Full DOM/CSS rendering support",
      "Isolated execution context",
      "Works with existing snapdom",
      "No service dependencies",
    ],
    cons: [
      "Memory overhead per iframe",
      "Limited by main thread",
      "iframe creation/cleanup costs",
      "Potential memory leaks",
    ],
  },

  worker: {
    pros: ["True parallelism", "Better memory management", "No DOM pollution", "Scalable processing"],
    cons: [
      "Cannot access DOM directly",
      "Complex for HTML rendering",
      "May need service dependencies",
      "Transferable object limits",
    ],
  },

  hybrid: {
    pros: [
      "Best of both worlds",
      "Worker handles heavy processing",
      "Main thread handles DOM",
      "Minimal service dependencies",
    ],
    cons: ["More complex architecture", "Still some main thread work", "Data transfer overhead"],
  },
};
