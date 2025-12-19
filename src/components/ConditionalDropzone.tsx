import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FileIcon } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface ConditionalDropzoneProps {
  children: React.ReactNode;
  shouldActivate: (e: React.DragEvent | DragEvent) => boolean;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  activeClassName?: string;
}

export function ConditionalDropzone({
  children,
  shouldActivate,
  onDrop,
  activeClassName = "bg-primary/20 border-primary",
}: ConditionalDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleDragEnter = useCallback(
    (e: React.DragEvent | DragEvent) => {
      if (shouldActivate(e)) {
        setIsDragActive(true);
      }
    },
    [shouldActivate]
  );

  const handleDragLeave = useCallback((e: React.DragEvent | DragEvent) => {
    if (e.relatedTarget === null || (e.target === document.body && e.clientY <= 0)) {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((_e: React.DragEvent | DragEvent) => {
    setIsDragActive(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    window.addEventListener("dragenter", handleDragEnter, { signal: controller.signal });
    window.addEventListener("dragleave", handleDragLeave, { signal: controller.signal });
    window.addEventListener("dragend", handleDrop, { signal: controller.signal });
    window.addEventListener("drop", handleDrop, { signal: controller.signal });
    return () => {
      controller.abort();
    };
  }, [handleDragEnter, handleDragLeave, handleDrop]);

  const overlayDragHandlers = {
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault(); // This is necessary to allow dropping
      e.stopPropagation();
    },
    onClick: (_e: React.MouseEvent<HTMLDivElement>) => {
      setIsDragActive(false);
    },
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      // This helps prevent flickering when moving over child elements
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setIsDragActive(false);
      }
    },
    onDrop: (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
      onDrop(e);
    },
  };

  return (
    <>
      {children}

      <div
        ref={overlayRef}
        {...(isDragActive ? overlayDragHandlers : {})}
        className={cn(
          "absolute inset-0 transition-colors duration-200 border-2 border-dashed border-transparent z-[999]",
          {
            "pointer-events-auto": isDragActive,
            "pointer-events-none": !isDragActive,
          },
          isDragActive && activeClassName
        )}
      >
        {isDragActive && (
          <div className="w-full h-full flex justify-center items-center font-mono">
            <Card className="w-96 h-60 p-4 flex justify-center items-center pointer-events-none">
              <div className="flex flex-col font-mono text-xs border-primary items-center border border-dashed w-full h-full rounded justify-center gap-2">
                <FileIcon />
                <div>drag & drop</div>
                <div>(docx, md, png, svg, jpeg, webp)</div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
