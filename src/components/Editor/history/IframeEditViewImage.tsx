import {
  ApiPoolWorker,
  NewComlinkSnapshotPoolWorker,
  useSnapApiPool,
} from "@/components/Editor/history/SnapApiPoolProvider";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

function useIframeImage({ editId, workspaceId, filePath }: { editId: number; workspaceId: string; filePath: string }) {
  const { work, terminate } = useSnapApiPool();

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  useEffect(() => {
    let worker: ApiPoolWorker | null = NewComlinkSnapshotPoolWorker(
      { editId, workspaceId, filePath },
      async ({ blob }) => {
        setImageUrl(URL.createObjectURL(blob));
      }
    );
    void work(worker);
    return () => {
      worker = null;
      // worker.cleanup(); ???
      terminate();
    };
  }, [editId, filePath, terminate, work, workspaceId]);
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
    <img src={imageUrl} className={cn("w-32 h-32 object-contain border border-black", className)} alt="" />
  ) : (
    <div className={cn("w-32 h-32 border border-black", className)}></div>
  );
};
