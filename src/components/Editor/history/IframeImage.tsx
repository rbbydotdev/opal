import {
  isIframeImageDebugMessage,
  isIframeImageMessage,
} from "@/app/(preview)/editview/[...editviewPath]/IframeImageMessagePayload";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

function createHiddenIframe(src: string): HTMLIFrameElement {
  console.log({ src });
  const iframe = document.createElement("iframe");
  iframe.src = src;
  return iframe;
}

function cleanupIframe(iframeRef: React.MutableRefObject<HTMLIFrameElement | null>) {
  if (iframeRef.current) {
    document.body.removeChild(iframeRef.current);
    iframeRef.current = null;
  }
}

function useIframeImage(src: string) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (isIframeImageDebugMessage(event)) {
        console.log("IframeImage Debug:", event.data.message);
        return;
      }
      if (isIframeImageMessage(event)) {
        const blob = event.data.blob;
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
        cleanupIframe(iframeRef);
        window.removeEventListener("message", handleMessage);
      }
    }

    const iframe = createHiddenIframe(src);
    console.log("opened iframe:", iframe.src);
    iframeRef.current = iframe;
    window.addEventListener("message", handleMessage);
    document.body.appendChild(iframe);

    return () => {
      window.removeEventListener("message", handleMessage);
      cleanupIframe(iframeRef);
    };
  }, [src]);

  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  return imageUrl;
}

export const IframeImage = ({ src, className }: { src: string; className?: string }) => {
  const imageUrl = useIframeImage(src);
  return imageUrl !== null ? (
    <img src={imageUrl} className={cn("w-32 h-32 _bg-blue-400 object-cover border border-black", className)} alt="" />
  ) : null;
};
