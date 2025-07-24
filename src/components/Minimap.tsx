import React, { useEffect, useRef } from "react";

type MinimapProps = {
  target: HTMLElement | null;
  width?: number;
  height?: number;
};

type NodeInfo = {
  type: string;
  rect: DOMRect;
  node: Element;
};

function getColorForNodeType(type: string): string {
  switch (type) {
    case "H1":
      return "#ff8888";
    case "P":
      return "#cccccc";
    default:
      return "#aaaaaa";
  }
}

function walkNodes(root: HTMLElement, editorRect: DOMRect): NodeInfo[] {
  const nodes: NodeInfo[] = [];
  function walk(node: Element) {
    if (node !== root) {
      const rect = node.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        nodes.push({
          type: node.tagName,
          rect: new DOMRect(rect.left - editorRect.left, rect.top - editorRect.top, rect.width, rect.height),
          node,
        });
      }
    }
    Array.from(node.children).forEach(walk);
  }
  walk(root);
  return nodes;
}

export const Minimap: React.FC<MinimapProps> = ({ target, width = 100, height = 100 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw the minimap
  const drawMinimap = () => {
    const canvas = canvasRef.current;
    if (!target || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const editorRect = target.getBoundingClientRect();
    const nodes = walkNodes(target, editorRect);

    ctx.clearRect(0, 0, width, height);

    const scaleX = width / editorRect.width;
    const scaleY = height / editorRect.height;

    // Draw non-image nodes first
    nodes.forEach(({ type, rect }) => {
      if (type === "IMG") return;
      ctx.fillStyle = getColorForNodeType(type);
      ctx.fillRect(
        rect.left * scaleX,
        rect.top * scaleY,
        Math.max(rect.width * scaleX, 1),
        Math.max(rect.height * scaleY, 1)
      );
    });

    // Draw images
    nodes
      .filter(({ type }) => type === "IMG")
      .forEach(({ rect, node }) => {
        const img = node as HTMLImageElement;
        if (!img.src) return;

        // If the image is already loaded, draw it
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(
            img,
            0,
            0,
            img.naturalWidth,
            img.naturalHeight,
            rect.left * scaleX,
            rect.top * scaleY,
            Math.max(rect.width * scaleX, 1),
            Math.max(rect.height * scaleY, 1)
          );
        } else {
          // If not loaded, set up a one-time load handler
          img.onload = () => {
            drawMinimap();
          };
        }
      });
  };

  // Set up MutationObserver
  useEffect(() => {
    if (!target) return;

    const observer = new MutationObserver(() => {
      drawMinimap();
    });

    observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    // Also redraw on resize
    window.addEventListener("resize", drawMinimap);

    // Initial draw
    drawMinimap();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", drawMinimap);
    };
    // eslint-disable-next-line
  }, [target, width, height]);

  // Redraw if the size of the minimap changes
  useEffect(() => {
    drawMinimap();
    // eslint-disable-next-line
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        border: "1px solid #ccc",
        background: "#222",
        zIndex: 1000,
        pointerEvents: "none",
      }}
    />
  );
};
