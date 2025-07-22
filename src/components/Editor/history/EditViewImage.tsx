import {
  ApiPoolWorker,
  NewComlinkSnapshotPoolWorker,
  useSnapApiPool,
} from "@/components/Editor/history/SnapApiPoolProvider";
import { HistoryDocRecord } from "@/Db/HistoryDAO";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

function useIframeImagePooled({
  edit,
  workspaceId,
  filePath,
}: {
  edit: HistoryDocRecord;
  workspaceId: string;
  filePath: string;
}) {
  const { work, flush: terminate } = useSnapApiPool();

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  useEffect(() => {
    if (edit.preview === null) {
      let worker: ApiPoolWorker | null = NewComlinkSnapshotPoolWorker(
        { editId: edit.edit_id, workspaceId, filePath },
        async ({ blob }) => {
          setImageUrl(URL.createObjectURL(blob));
        }
      );
      void work(worker);
      return () => {
        terminate();
        worker = null;
      };
    } else {
      setImageUrl(URL.createObjectURL(edit.preview));
    }
  }, [edit, filePath, terminate, work, workspaceId]);
  useEffect(() => {
    return () => {
      try {
        URL.revokeObjectURL(imageUrl ?? "");
      } catch (e) {
        console.error(e);
      }
    };
  }, [imageUrl, work]);
  return imageUrl;
}

export const EditViewImage = ({
  workspaceId,
  filePath,
  edit,
  className,
}: {
  workspaceId: string;
  filePath: string;
  edit: HistoryDocRecord;
  className?: string;
}) => {
  const imageUrl = useIframeImagePooled({ edit, filePath, workspaceId });
  return imageUrl !== null ? (
    <img src={imageUrl} className={cn("w-32 h-32 object-contain border border-black", className)} alt="" />
  ) : (
    <div className={cn("w-32 h-32 border border-black", className)}></div>
  );
};
