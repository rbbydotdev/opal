import { NewComlinkSnapshotPoolWorker, useSnapApiPool } from "@/components/Editor/history/SnapApiPoolProvider";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

function useIframeImage({ editId, workspaceId, filePath }: { editId: number; workspaceId: string; filePath: string }) {
  const { work } = useSnapApiPool();

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const worker = useMemo(() => {
    // console.log("Creating new worker for editId", editId, "filePath", filePath, "workspaceId", workspaceId);
    return NewComlinkSnapshotPoolWorker({ editId, workspaceId, filePath }, async ({ blob }) => {
      setImageUrl(URL.createObjectURL(blob));
    });
  }, [editId, filePath, workspaceId]);
  // useEffect(() => {
  //   const history = new HistoryDAO();
  //   void (async () => {
  //     const change = await history.getEditByEditId(editId);
  //     if (change?.preview) {
  //       setImageUrl(URL.createObjectURL(change.preview));
  //     } else {
  //       void work(worker);
  //     }
  //   })();
  // }, [editId, work, worker]);
  useEffect(() => {
    void work(worker);
  }, [work, worker]);
  useEffect(() => {
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
