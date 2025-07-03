"use client";
import { encodePath } from "@/lib/paths2";

export function ImageViewer({ alt = "image", origSrc = "" }: { alt?: string; origSrc?: string }) {
  return (
    <div className="flex justify-center items-center h-full w-full flex-col">
      <img
        className="max-h-[95vh] max-w-[95vw] aspect-auto bg-white object-contain"
        alt={alt}
        src={encodePath(origSrc)}
      />
    </div>
  );
}
