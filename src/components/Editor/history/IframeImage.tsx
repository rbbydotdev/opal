import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export const IframeImage = ({ src, className }: { src: string; className?: string }) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "BLOB_RESULT" && event.data.src) {
        setImageUrl(event.data.src);

        // Cleanup: remove iframe and event listener
        if (iframeRef.current) {
          document.body.removeChild(iframeRef.current);
          // console.debug("IframeImage: Removed iframe from DOM");
          iframeRef.current = null;
        }
        window.removeEventListener("message", handleMessage);
        // console.debug("IframeImage: Removed message event listener");
      }
    };

    // Create hidden iframe
    const iframe = document.createElement("iframe");
    // iframe.style.display = "none";
    iframe.src = src;
    iframeRef.current = iframe;
    // console.debug("IframeImage: Created iframe with src", src);

    // Listen for messages
    window.addEventListener("message", handleMessage);
    // console.debug("IframeImage: Added message event listener");

    // Append to DOM
    document.body.appendChild(iframe);
    // console.debug("IframeImage: Appended iframe to DOM");

    // Cleanup on unmount
    return () => {
      window.removeEventListener("message", handleMessage);
      // console.debug("IframeImage: Cleanup - removed message event listener");
      if (iframeRef.current) {
        document.body.removeChild(iframeRef.current);
        // console.debug("IframeImage: Cleanup - removed iframe from DOM");
        iframeRef.current = null;
      }
    };
  }, [src]);

  return imageUrl !== null ? (
    <img src={imageUrl} className={cn("w-32 h-32 _bg-blue-400 object-cover border border-black", className)} alt="" />
  ) : null;
};
