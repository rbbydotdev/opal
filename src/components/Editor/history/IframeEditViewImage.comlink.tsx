import { usePoolContext } from "@/components/PoolWorker";
import { cn } from "@/lib/utils";
import * as Comlink from "comlink";
import { useEffect, useMemo, useState } from "react";

interface Resource {
  resource: PreviewWorkerApi;
  ready: Promise<boolean>;

  terminate: () => void;
}
function createApiResource({
  editId,
  workspaceId,
  filePath,
}: {
  editId: number;
  workspaceId: string;
  filePath: string;
}) {
  const iframe = document.createElement("iframe");
  const api = Comlink.wrap<PreviewWorkerApi>(Comlink.windowEndpoint(iframe.contentWindow!));
  const ready: Promise<boolean> = new Promise((rs) => (iframe.onload = () => rs(true)));
  document.body.appendChild(iframe);
  const searchParams = new URLSearchParams({
    editId: String(editId),
    filePath,
    workspaceId,
  });
  const terminate = () => iframe.remove();
  iframe.src = "/doc-preview-image.html?" + searchParams.toString();
  return { resource: api, ready, terminate } satisfies Resource;
}
function NewComlinkSnapshotPoolWorker(
  { editId, workspaceId, filePath }: { editId: number; workspaceId: string; filePath: string },
  cb: ({ editId, blob }: { editId: number; blob: Blob }) => void
) {
  // return new PoolWorker((api) => api.renderAndSnapshot(editId).then((result) => cb(result)), ready, iframe.remove);
}

function useIframeImage({ editId, workspaceId, filePath }: { editId: number; workspaceId: string; filePath: string }) {
  const { work } = usePoolContext();

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const worker = useMemo(
    () =>
      NewComlinkSnapshotPoolWorker({ editId, workspaceId, filePath }, ({ blob }) => {
        setImageUrl(URL.createObjectURL(blob));
      }),
    [editId, filePath, workspaceId]
  );
  useEffect(() => {
    void work(worker);
    return () => {
      try {
        URL.revokeObjectURL(imageUrl ?? "");
      } catch (e) {
        console.error(e);
      }
    };
  }, [imageUrl, work, worker]);
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
  const imageUrl = useIframeImage({ editId, filePath, workspaceId });
  return imageUrl !== null ? (
    <img src={imageUrl} className={cn("w-32 h-32 _bg-blue-400 object-cover border border-black", className)} alt="" />
  ) : null;
};
