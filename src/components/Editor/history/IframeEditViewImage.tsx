import {
  isIframeErrorMessage,
  isIframeImageMessage,
} from "@/app/(preview)/editview/[...editviewPath]/IframeImageMessagePayload";
import { Workspace } from "@/Db/Workspace";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

function createHiddenIframe(src: string): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.src = src;
  return iframe;
}

function cleanupIframe(iframeRef: React.MutableRefObject<HTMLIFrameElement | null>) {
  if (iframeRef.current) {
    console.log("cleaning up iframe:", iframeRef.current.src);
    document.body.removeChild(iframeRef.current);
    iframeRef.current = null;
  }
}

function useIframeImage(src: string, editId: string | number) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (isIframeErrorMessage(event)) {
        console.error("Error in iframe:", event.data.error);
        // Optionally, you can handle the error here, e.g., show a notification
        cleanupIframe(iframeRef);
        window.removeEventListener("message", handleMessage);
        return;
      }
      if (isIframeImageMessage(event) && String(event.data.editId) === String(editId)) {
        const blob = event.data.blob;
        console.log(blob.toString());
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
  currentWorkspace,
}: {
  currentWorkspace: Workspace;
  src: string;
  editId: string | number;
  className?: string;
}) => {
  const imageUrl = useIframeImage(src, editId);
  return imageUrl !== null ? (
    <img src={imageUrl} className={cn("w-32 h-32 _bg-blue-400 object-cover border border-black", className)} alt="" />
  ) : null;
};
