import { isIframeImageMessage } from "@/app/(preview)/editview/[...editviewPath]/IframeImageMessagePayload";
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

function useIframeImage(src: string, editId: string | number) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (isIframeImageMessage(event) && String(event.data.editId) === String(editId)) {
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
  }, [editId, src]);

  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  return imageUrl;
}

export const IframeEditViewImage = ({
  src,
  editId,
  className,
}: {
  src: string;
  editId: string | number;
  className?: string;
}) => {
  const imageUrl = useIframeImage(src, editId);
  return imageUrl !== null ? (
    <img src={imageUrl} className={cn("w-32 h-32 _bg-blue-400 object-cover border border-black", className)} alt="" />
  ) : null;
};
