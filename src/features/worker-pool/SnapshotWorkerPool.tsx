import React from 'react';
import { WorkerPoolProvider, useWorkerPool } from './index';

// Define the web worker API for screenshot generation
interface SnapshotWorkerAPI {
  // Option 1: Pre-process data in worker, render in main thread
  prepareMarkdownData(markdownContent: string): Promise<{
    processedHtml: string;
    metadata: any;
    styles: string[];
  }>;
  
  // Option 2: Generate screenshot via headless browser service
  generateScreenshotFromUrl(params: {
    url: string;
    viewport: { width: number; height: number };
    options: ScreenshotOptions;
  }): Promise<Blob>;
  
  // Option 3: Process image data (post-DOM capture)
  processImageData(params: {
    imageData: ImageData;
    filters: ImageFilter[];
    compression: CompressionOptions;
  }): Promise<Blob>;
  
  // Option 4: Coordinate with offscreen canvas
  renderToOffscreenCanvas(params: {
    renderInstructions: RenderInstruction[];
    canvas: OffscreenCanvas;
  }): Promise<Blob>;
}

interface ScreenshotOptions {
  format: 'webp' | 'png' | 'jpeg';
  quality: number;
  scale: number;
  clip?: { x: number; y: number; width: number; height: number };
}

interface ImageFilter {
  type: 'blur' | 'brightness' | 'contrast' | 'scale';
  value: number;
}

interface CompressionOptions {
  format: 'webp' | 'png' | 'jpeg';
  quality: number;
}

interface RenderInstruction {
  type: 'text' | 'image' | 'shape';
  data: any;
  position: { x: number; y: number };
  style: Record<string, any>;
}

// Provider component for screenshot worker pool
export function SnapshotWorkerPoolProvider({ children }: { children: React.ReactNode }) {
  return (
    <WorkerPoolProvider<SnapshotWorkerAPI>
      id="snapshot-worker"
      src="/src/features/worker-pool/snapshot-worker.ts"
      count={3}
    >
      {children}
    </WorkerPoolProvider>
  );
}

// Hook to use the snapshot worker pool
export function useSnapshotWorkerPool() {
  return useWorkerPool<SnapshotWorkerAPI>("snapshot-worker");
}

// Usage example with different strategies
export function SnapshotExample() {
  const { cmd } = useSnapshotWorkerPool();
  
  // Strategy 1: Hybrid approach - worker preprocesses, main thread renders
  const generateScreenshotHybrid = async (markdownContent: string) => {
    // Worker processes the markdown and prepares optimized data
    const { processedHtml, metadata, styles } = await cmd.prepareMarkdownData(markdownContent);
    
    // Main thread handles DOM rendering (since workers can't access DOM)
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = processedHtml;
    document.body.appendChild(tempContainer);
    
    // Capture with snapdom (or similar)
    const blob = await captureElement(tempContainer);
    
    // Cleanup
    document.body.removeChild(tempContainer);
    
    return blob;
  };

  // Strategy 2: Service-based approach
  const generateScreenshotService = async (editId: number) => {
    // Worker coordinates with a headless browser service
    const screenshotUrl = `/api/preview/${editId}`;
    return await cmd.generateScreenshotFromUrl({
      url: screenshotUrl,
      viewport: { width: 800, height: 600 },
      options: {
        format: 'webp',
        quality: 0.8,
        scale: 1
      }
    });
  };

  // Strategy 3: OffscreenCanvas approach
  const generateScreenshotOffscreen = async (renderData: any) => {
    // Transfer canvas to worker
    const canvas = new OffscreenCanvas(800, 600);
    
    return await cmd.renderToOffscreenCanvas({
      renderInstructions: renderData,
      canvas: canvas
    });
  };

  return (
    <div>
      <button onClick={() => generateScreenshotHybrid("# Hello World")}>
        Generate Hybrid Screenshot
      </button>
      <button onClick={() => generateScreenshotService(123)}>
        Generate Service Screenshot  
      </button>
      <button onClick={() => generateScreenshotOffscreen({})}>
        Generate Offscreen Screenshot
      </button>
    </div>
  );
}

// Pseudo-implementation helper (would be replaced with actual snapdom/similar)
async function captureElement(element: HTMLElement): Promise<Blob> {
  // This would use your existing snapdom logic
  // but called from main thread after worker preprocessing
  return new Blob(['fake-screenshot'], { type: 'image/webp' });
}