import { TrashBanner } from "@/components/TrashBanner";
import { useCurrentFilepath } from "@/context/WorkspaceContext";
import { encodePath } from "@/lib/paths2";

export function ImageViewer({ alt = "image", origSrc = "" }: { alt?: string; origSrc?: string }) {
  const { inTrash, filePath } = useCurrentFilepath();
  if (!filePath) return null;
  return (
    <>
      {inTrash && <TrashBanner filePath={filePath} />}
      <div className="flex justify-center items-center h-full w-full flex-col p-12">
        <img className="aspect-auto object-contain rounded-md overflow-hidden" alt={alt} src={encodePath(origSrc)} />
      </div>
    </>
  );
}
