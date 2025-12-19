import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { HistoryStore } from "@/data/dao/HistoryDAO";
import { HistoryDocRecord } from "@/data/HistoryTypes";
import { stripFrontmatter } from "@/lib/markdown/frontMatter";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useToggleHistoryImageGeneration } from "./useToggleHistoryImageGeneration";

function previewId({ workspaceId, editId }: { workspaceId: string; editId: string }) {
  return `${workspaceId}/${editId}`;
}

export async function generateHtmlPreview(edit: HistoryDocRecord): Promise<Blob> {
  const historyDAO = new HistoryStore();
  try {
    const reconstructedContent = (await historyDAO.reconstructDocumentFromEdit(edit)) ?? "";
    const html = renderMarkdownToHtml(stripFrontmatter(reconstructedContent));
    const blob = new Blob([html], { type: "text/html" });
    // Store the HTML blob in the database
    await historyDAO.updatePreviewForEditId(edit.edit_id, blob);

    return blob;
  } finally {
    historyDAO.tearDown();
  }
}

export function useHtmlPreviewGenerator() {
  const { isHistoryImageGenerationEnabled } = useToggleHistoryImageGeneration();

  return function generatePreview(edit: HistoryDocRecord) {
    if (!isHistoryImageGenerationEnabled) return;
    void generateHtmlPreview(edit);
  };
}

function useHtmlPreview({ edit, workspaceId, id }: { edit: HistoryDocRecord; workspaceId: string; id: string }) {
  const { isHistoryImageGenerationEnabled } = useToggleHistoryImageGeneration();
  const [htmlContent, setHtmlContent] = useState<string | null>(null);

  useEffect(() => {
    if (!isHistoryImageGenerationEnabled) {
      setHtmlContent(null);
      return;
    }

    if (edit.preview === null) {
      // Generate HTML preview directly in main thread
      generateHtmlPreview(edit)
        .then(async (blob) => {
          const html = await blob.text();
          setHtmlContent(html);
        })
        .catch(console.error);
    } else {
      edit.preview.text().then(setHtmlContent).catch(console.error);
    }
  }, [edit, id, workspaceId, isHistoryImageGenerationEnabled]);

  return htmlContent;
}

function ShadowDomPreview({ htmlContent, className }: { htmlContent: string; className?: string }) {
  const [shadowHost, setShadowHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!shadowHost || !htmlContent) return;

    // Only attach shadow if it doesn't exist
    let shadow = shadowHost.shadowRoot;
    if (!shadow) {
      try {
        shadow = shadowHost.attachShadow({ mode: "closed" });
      } catch (error) {
        console.error("Failed to attach shadow DOM:", error);
        return;
      }
    }

    // Clear and populate shadow content
    shadow.innerHTML = "";

    // Add basic styling for the shadow DOM
    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        overflow: hidden;
        transform-origin: top left;
        transform: scale(1);
      }
      *, *::before, *::after {
        max-width: none;
        word-wrap: break-word;
        font-size: 14px;
        line-height: 1.6;
        color: #000 !important;
      }
      img {
        max-width: 100%;
        height: auto;
      }
      body {
        margin: 0;
        padding: 16px;
        width: 1200px;
        height: 1200px;
      }
    `;

    const contentDiv = document.createElement("div");
    contentDiv.innerHTML = htmlContent;

    shadow.appendChild(style);
    shadow.appendChild(contentDiv);
  }, [shadowHost, htmlContent]);

  return (
    <div
      key={htmlContent} // Force remount on content change
      ref={setShadowHost}
      className={cn("w-full h-full bg-white", className)}
    />
  );
}

export const EditViewImage = ({
  workspaceId,
  edit,
  className,
}: {
  workspaceId: string;
  edit: HistoryDocRecord;
  className?: string;
}) => {
  const id = previewId({ workspaceId, editId: edit.id });
  const htmlContent = useHtmlPreview({ edit, workspaceId, id });

  return htmlContent !== null ? (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className={cn("w-12 h-12 border border-border bg-white cursor-pointer overflow-hidden", className)}>
          <div style={{ transform: "scale(0.1)", transformOrigin: "top left", width: "400px", height: "400px" }}>
            <ShadowDomPreview htmlContent={htmlContent} />
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent
        side="right"
        className="p-2 bg-white border border-gray-200 shadow-lg rounded w-96 h-96 overflow-y-auto overflow-x-hidden no-scrollbar"
        style={{ boxShadow: "0 4px 12px 0 oklch(var(--foreground))" }}
      >
        <div style={{ transform: "scale(0.9)", transformOrigin: "top left", width: "400px" }}>
          <ShadowDomPreview htmlContent={htmlContent} />
        </div>
      </HoverCardContent>
    </HoverCard>
  ) : (
    <div className={cn("w-12 h-12 border border-border", className)}></div>
  );
};
