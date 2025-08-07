// src/components/ui/element-capture-modal.tsx

import { snapdom } from "@zumer/snapdom";
import { AlertCircle, Loader2 } from "lucide-react";
import * as React from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slot } from "@radix-ui/react-slot";

type SnapdomOptions = {
  compress?: boolean;
  fast?: boolean;
  embedFonts?: boolean;
  scale?: number;
  backgroundColor?: string;
  quality?: number;
  crossOrigin?: (url: string) => "anonymous" | "use-credentials";
};

interface ElementCaptureModalProps {
  targetClass: string;
  children: React.ReactElement; // Trigger must be a single React element
  snapOptions?: SnapdomOptions;
  modalTitle?: string;
  modalDescription?: string;
  /** The fixed width for the cloned element before capture. */
  captureWidth?: number;
  /** The fixed height for the cloned element before capture. */
  captureHeight?: number;
}

export function ElementCaptureModal({
  targetClass,
  children,
  snapOptions,
  modalTitle = "Element Snapshot",
  modalDescription = "Here is a snapshot of the selected element.",
  captureWidth = 800,
  captureHeight = 1200,
}: ElementCaptureModalProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [captureDuration, setCaptureDuration] = React.useState<number | null>(null);

  const handleCaptureAndOpen = async () => {
    // --- NEW: If image already exists, just open the modal and exit ---
    if (imageUrl) {
      setIsOpen(true);
      return;
    }

    // Show loading state inside the modal immediately
    setIsLoading(true);
    setIsOpen(true);
    setError(null);
    setCaptureDuration(null);

    // --- NEW: Create an off-screen container for the clone ---
    const offscreenContainer = document.createElement("div");
    Object.assign(offscreenContainer.style, {
      position: "absolute",
      top: "-9999px",
      left: "-9999px",
      width: `${captureWidth}px`,
      height: `${captureHeight}px`,
    });

    try {
      const elementToCapture = document.querySelector<HTMLElement>(`.${targetClass}`);

      if (!elementToCapture) {
        throw new Error(`Element with class "${targetClass}" could not be found.`);
      }

      // --- NEW: Clone the element and style it ---
      const clone = elementToCapture.cloneNode(true) as HTMLElement;
      // Ensure the clone fills the container
      Object.assign(clone.style, {
        width: `${captureWidth}px`,
        height: `${captureHeight}px`,
        boxSizing: "border-box",
      });

      // Add the clone to our off-screen container, and the container to the body
      offscreenContainer.appendChild(clone);
      document.body.appendChild(offscreenContainer);

      const startTime = performance.now();
      const imgElement = await snapdom.toWebp(clone, snapOptions);
      const endTime = performance.now();
      setCaptureDuration(endTime - startTime);
      setImageUrl(imgElement.src);
    } catch (err) {
      console.error("snapdom capture failed:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      if (document.body.contains(offscreenContainer)) {
        document.body.removeChild(offscreenContainer);
      }
      setIsLoading(false);
    }
  };

  return (
    <>
      <Slot onClick={handleCaptureAndOpen}>{children}</Slot>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[80vw] md:max-w-[60vw] lg:max-w-[50vw]">
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
            <DialogDescription>{modalDescription}</DialogDescription>
          </DialogHeader>

          <div className="flex min-h-[18.75rem] items-center justify-center rounded-md border bg-muted">
            {isLoading && (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Capturing snapshot...</p>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="w-auto">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {imageUrl && !isLoading && (
              <img
                src={imageUrl}
                alt="Captured element snapshot"
                className="max-h-[70vh] max-w-full rounded-md object-contain"
              />
            )}
          </div>

          <DialogFooter>
            <div className="flex w-full items-center justify-between">
              <div>
                {imageUrl && captureDuration !== null && (
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-muted-foreground">Capture took: {captureDuration.toFixed(2)} ms</p>
                    {imageUrl && (
                      <p className="text-sm text-muted-foreground">
                        Size: {((imageUrl.length * 3) / 4 / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                )}
              </div>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
