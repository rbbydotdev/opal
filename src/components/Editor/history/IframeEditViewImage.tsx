import {
  isIframeErrorMessage,
  isIframeImageMessage,
} from "@/app/(preview)/editview/[...editviewPath]/IframeImageMessagePayload";
import { useHistoryDAO } from "@/Db/HistoryDAO";
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

function useIframeImage(src: string, editId: number) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const historyDB = useHistoryDAO();

  useEffect(() => {
    void (async () => {
      const { preview } = (await historyDB.getEditByEditId(parseInt(String(editId)))) ?? { preview: null };
      if (!preview) {
        const iframe = createHiddenIframe(src);
        console.log("opened iframe:", iframe.src);
        iframeRef.current = iframe;
        document.body.appendChild(iframe);
      } else {
        const url = URL.createObjectURL(preview);
        setImageUrl(url);
        // console.log("Using cached preview for editId:", editId);
      }
    })();
    return () => {
      cleanupIframe(iframeRef);
    };
  }, [editId, historyDB, src]);
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (isIframeErrorMessage(event)) {
        console.error("Error in iframe:", event.data.error);
        cleanupIframe(iframeRef);
        window.removeEventListener("message", handleMessage);
        return;
      }
      if (isIframeImageMessage(event) && String(event.data.editId) === String(editId)) {
        const blob = event.data.blob;
        void historyDB.updatePreviewForEditId(editId, blob); //should do this in iframe?
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
        cleanupIframe(iframeRef);
        window.removeEventListener("message", handleMessage);
      }
    }
    window.addEventListener("message", (event) => handleMessage(event));
    return () => {
      window.removeEventListener("message", (event) => handleMessage(event));
    };
  }, [editId, historyDB, src]);

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
  workspaceId,
  filePath,
  editId,
  className,
}: {
  workspaceId: string;
  filePath: string;
  editId: number;
  className?: string;
}) => {
  const searchParams = new URLSearchParams({
    editId: String(editId),
    filePath,
    workspaceId,
  });
  const src = `/doc-preview-image.html?${searchParams.toString()}`;
  const imageUrl = useIframeImage(src, editId);
  return imageUrl !== null ? (
    <img src={imageUrl} className={cn("w-32 h-32 _bg-blue-400 object-cover border border-black", className)} alt="" />
  ) : null;
};
