import {
  ApiPoolWorker,
  NewComlinkSnapshotPoolWorker,
  useSnapApiPool,
} from "@/components/Editor/history/SnapApiPoolProvider";
import { useToggleHistoryImageGeneration } from "@/components/Editor/history/EditHistoryMenu";
import { ImageFileHoverCard } from "@/components/ImageFileHoverCard";
import { HistoryDocRecord } from "@/Db/HistoryDAO";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

function previewId({ workspaceId, editId }: { workspaceId: string; editId: string }) {
  return `${workspaceId}/${editId}`;
}

export function useIframeImagePooledImperitiveWorker({ workspaceId }: { workspaceId: string }) {
  const { work } = useSnapApiPool();
  const { isHistoryImageGenerationEnabled } = useToggleHistoryImageGeneration();

  return function previewForEdit(edit: HistoryDocRecord) {
    if (!isHistoryImageGenerationEnabled) return;
    const worker: ApiPoolWorker = NewComlinkSnapshotPoolWorker({ editId: edit.edit_id, workspaceId });
    void work(worker);
  };
}

function useIframeImagePooled({ edit, workspaceId, id }: { edit: HistoryDocRecord; workspaceId: string; id: string }) {
  const { work, flush } = useSnapApiPool();
  const { isHistoryImageGenerationEnabled } = useToggleHistoryImageGeneration();

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!isHistoryImageGenerationEnabled) {
      setImageUrl(null);
      return;
    }
    
    if (edit.preview === null) {
      let worker: ApiPoolWorker | null = NewComlinkSnapshotPoolWorker(
        { editId: edit.edit_id, workspaceId, id },
        async ({ blob }) => {
          setImageUrl(URL.createObjectURL(blob));
        }
      );
      void work(worker);
      return () => {
        flush();
        worker = null;
      };
    } else {
      setImageUrl(URL.createObjectURL(edit.preview));
    }
  }, [edit, id, flush, work, workspaceId, isHistoryImageGenerationEnabled]);
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
  edit,
  className,
}: {
  workspaceId: string;
  edit: HistoryDocRecord;
  className?: string;
}) => {
  const imageUrl = useIframeImagePooled({ edit, workspaceId, id: previewId({ workspaceId, editId: edit.id }) });
  return imageUrl !== null ? (
    <ImageFileHoverCard className="w-48 h-48">
      <img src={imageUrl} className={cn("object-contain border border-border bg-white", className)} alt="" />
    </ImageFileHoverCard>
  ) : (
    <div className={cn("border border-border", className)}></div>
  );
};
