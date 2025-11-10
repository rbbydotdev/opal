import { TrashBanner } from "@/components/TrashBanner";
import { useCurrentFilepath } from "@/context/WorkspaceContext";
import { encodePath } from "@/lib/paths2";
import { useEffect, useRef } from "react";

export function ImageViewer({ alt = "image", origSrc = "" }: { alt?: string; origSrc?: string }) {
  const { inTrash, filePath } = useCurrentFilepath();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const convertedRef = useRef(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !origSrc) return;

    convertedRef.current = false;

    const handleLoad = () => {
      if (convertedRef.current) return;
      if (img.src.startsWith("blob:")) return;

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw pixel-exact
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

      canvas.toBlob(
        (blob) => {
          if (!blob) return;

          // Clean up old blob URL if any
          if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);

          const blobUrl = URL.createObjectURL(blob);
          blobUrlRef.current = blobUrl;

          img.src = blobUrl;
          convertedRef.current = true;
        },
        // You can swap for "image/png" for perfect fidelity
        "image/webp",
        1.0 // maximum quality
      );
    };

    img.addEventListener("load", handleLoad);

    return () => {
      img.removeEventListener("load", handleLoad);
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [origSrc]);

  if (!filePath) return null;

  return (
    <>
      {inTrash && <TrashBanner filePath={filePath} />}
      <div className="flex justify-center items-center h-full w-full flex-col p-12">
        <img
          ref={imgRef}
          className="aspect-auto object-contain rounded-md overflow-hidden"
          alt={alt}
          src={encodePath(origSrc)}
          crossOrigin="anonymous"
        />
      </div>
    </>
  );
}
