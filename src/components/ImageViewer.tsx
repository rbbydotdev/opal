"use client";
import { encodePath } from "@/lib/paths2";

export function ImageViewer({ alt = "image", origSrc = "" }: { alt?: string; origSrc?: string }) {
  return (
    <div className="p-4 m-auto flex justify-center items-center h-full w-full flex-col">
      <img className="max-h-[1200px] aspect-auto bg-white" alt={alt} src={encodePath(origSrc)} />
    </div>
  );
}
