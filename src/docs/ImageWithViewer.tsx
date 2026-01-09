import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ImageWithViewerProps {
  src: string;
  alt?: string;
  thumbnailClassName?: string;
  modalClassName?: string;
  thumbnailStyle?: React.CSSProperties;
}

export const ImageWithViewer = ({
  src,
  alt = "",
  thumbnailClassName = "",
  modalClassName = "",
  thumbnailStyle = {},
}: ImageWithViewerProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`cursor-pointer transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg ${thumbnailClassName}`}
          aria-label={`View larger image${alt ? `: ${alt}` : ""}`}
        >
          <img
            src={src}
            alt={alt}
            className="rounded-lg border-2 border-dashed"
            style={{
              maxWidth: "400px",
              width: "100%",
              height: "auto",
              ...thumbnailStyle,
            }}
          />
        </button>
      </DialogTrigger>
      <DialogContent
        className={`!max-w-none !w-[96vw] !h-[96vh] !top-[2vh] !left-[2vw] !translate-x-0 !translate-y-0 p-4 overflow-hidden ${modalClassName}`}
        onClick={() => setOpen(false)}
      >
        <div className="flex items-center justify-center w-full h-full">
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full w-auto h-auto object-contain"
            style={{ maxWidth: "100%", maxHeight: "100%" }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
