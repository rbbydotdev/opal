import { TrashBanner } from "@/components/TrashBanner";
import { useCurrentFilepath } from "@/workspace/WorkspaceContext";
import { Download } from "lucide-react";
import { useState } from "react";

export function ImageViewer({ alt = "image", origSrc = "" }: { alt?: string; origSrc?: string }) {
  const { inTrash, filePath } = useCurrentFilepath();
  const [downloading, setDownloading] = useState(false);

  if (!filePath) return null;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const response = await fetch(origSrc, { cache: "no-store" });
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = filePath.split("/").pop() || "image";
      link.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error while downloading:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      {inTrash && <TrashBanner filePath={filePath} />}
      <div className="flex justify-center items-center h-full w-full flex-col p-12">
        <div className="relative inline-block max-h-full max-w-full">
          <img
            className="aspect-auto object-contain rounded-md overflow-hidden max-h-full max-w-full"
            alt={alt}
            src={origSrc}
            crossOrigin="anonymous"
          />

          {/* Download Button — inside image */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            aria-label="Download image"
            className="absolute top-2 right-2 opacity-50 hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-md p-2 shadow-sm border disabled:opacity-30"
          >
            <Download className={`h-4 w-4 ${downloading ? "animate-pulse text-muted-foreground" : ""}`} />
          </button>
        </div>
      </div>
    </>
  );
}
