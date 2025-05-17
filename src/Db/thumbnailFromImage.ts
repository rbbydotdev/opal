import { DiskJType } from "@/Db/Disk";
import { ImagesWorker } from "@/lib/ImagesWorker/instance";

//avoiding circular dependency for now
export async function thumbnailFromImage({
  path,
  thumbStore,
  content,
  size = 50,
}: {
  path: string;
  thumbStore: DiskJType;
  content: Uint8Array;
  size: number;
}) {
  const thumbGuid = await ImagesWorker.api.thumbnailForWorkspace({
    path,
    thumbStore,
    content,
    size,
  });
  return thumbGuid;
}
