import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FileIcon } from "lucide-react";
import { useState } from "react";

export const ImageViewerDropZone = ({
  children,
  className,
  onDrop,
  ...rest
}: {
  className?: string;
  children?: React.ReactNode;
  onDrop: React.DragEventHandler<HTMLDivElement>;
}) => {
  const [isOpen, setOpen] = useState(false);

  // --- Refactoring Suggestion: Consolidate event handlers ---
  // This avoids duplicating the same logic for both the div and the Card.
  const dragHandlers = {
    onDragEnter: (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isOpen) setOpen(true);
    },
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
      // This is the crucial part!
      e.preventDefault();
      e.stopPropagation();
      if (!isOpen) setOpen(true);
    },
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      // Check if the mouse is leaving to outside the component bounds
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setOpen(false);
      }
    },
    onDrop: (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("DROP!");
      setOpen(false); // Close the dropzone UI after a successful drop
      onDrop(e);
    },
  };

  return (
    <div
      className={cn("bg-transparent absolute z-50 inset-0 flex justify-center items-center", className, {
        // Only show the background overlay when a drag is active
        "bg-primary/40": isOpen,
      })}
      // Spread the handlers onto the main container
      {...dragHandlers}
      {...rest}
    >
      {isOpen && (
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
      )}
      {children}
    </div>
  );
};
