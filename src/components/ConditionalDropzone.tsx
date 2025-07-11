"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils"; // Assuming you have a utility for classnames
import { FileIcon } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface ConditionalDropzoneProps {
  children: React.ReactNode;
  // A function to decide if the overlay should activate for the dragged content
  shouldActivate: (e: React.DragEvent) => boolean;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  className?: string;
  activeClassName?: string;
}

export function ConditionalDropzone({
  children,
  shouldActivate,
  onDrop,
  className,
  activeClassName = "bg-primary/20 border-primary", // Example active style
}: ConditionalDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Memoize handlers to prevent re-creating them on every render
  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (shouldActivate(e as any)) {
        setIsDragActive(true);
      }
    },
    [shouldActivate]
  );

  const handleDragLeave = useCallback((e: DragEvent) => {
    // Check if the mouse is leaving the window
    if (e.relatedTarget === null || (e.target === document.body && e.clientY <= 0)) {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((_e: DragEvent) => {
    // Reset on any drop anywhere to clean up
    setIsDragActive(false);
  }, []);

  // Set up global listeners to detect when a drag enters/leaves the window
  useEffect(() => {
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDrop]);

  // These are the handlers for the overlay itself, once it's active
  const overlayDragHandlers = {
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault(); // This is necessary to allow dropping
      e.stopPropagation();
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
      setIsDragActive(false); // Deactivate after drop
      onDrop(e); // Fire the user-provided onDrop handler
    },
  };

  return (
    <>
      <div className={cn("relative w-full h-full flex justify-center items-center", className)}>
        {children}

        <div
          ref={overlayRef}
          {...(isDragActive ? overlayDragHandlers : {})}
          className={cn(
            "absolute inset-0 transition-colors duration-200 border-2 border-dashed border-transparent z-[999]",
            // This is the key: toggle pointer-events based on state
            {
              "pointer-events-auto": isDragActive,
              "pointer-events-none": !isDragActive,
            },
            isDragActive && activeClassName
          )}
        >
          {/* Optional: Show a message when the dropzone is active */}
          {isDragActive && (
            <div className="w-full h-full flex justify-center items-center font-mono">
              <Card
                // The handlers are on the parent, so the card just acts as a visual
                className="w-96 h-60 p-4 flex justify-center items-center pointer-events-none" // `pointer-events-none` prevents flickering
              >
                <div className="flex flex-col font-mono text-xs border-primary items-center border border-dashed w-full h-full rounded justify-center gap-2">
                  <FileIcon />
                  <div>drag & drop</div>
                  <div>(docx, md, png, svg, jpeg, webp)</div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
