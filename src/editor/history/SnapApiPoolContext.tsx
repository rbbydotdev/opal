import { CreatePoolContext } from "@/components/CreatePoolContext";
import { PoolWorker, Resource } from "@/components/PoolWorker";
import { PreviewWorkerApiType } from "@/types/PreviewWorkerTypes";

import * as Comlink from "comlink";

export async function createApiResource({
  editId,
  workspaceId,
}: {
  editId: number;
  workspaceId: string;
}): Promise<Resource<Comlink.Remote<PreviewWorkerApiType>>> {
  let iframe: HTMLIFrameElement | null = document.createElement("iframe");
  const searchParams = new URLSearchParams({
    editId: String(editId),
    filePath: "/preview-doc.md",
    workspaceId,
  });
  iframe.src = "/doc-preview-image.html?" + searchParams.toString();
  iframe.style.transform = "translate(-9999px, -9999px)";
  iframe.style.position = "absolute";
  document.body.appendChild(iframe);
  await new Promise((rs) => (iframe!.onload = () => rs(true)));
  console.debug("iframe up");
  let api: Comlink.Remote<PreviewWorkerApiType> | null = Comlink.wrap<PreviewWorkerApiType>(
    Comlink.windowEndpoint(iframe.contentWindow!)
  );
  const terminate = () => {
    console.debug("terminating api resource");
    (iframe || { src: "" }).src = "about:blank";
    api?.[Comlink.releaseProxy]();
    iframe?.remove();
    api = null;
    iframe = null;
  };
  return { api, terminate };
}
export function NewComlinkSnapshotPoolWorker(
  { editId, workspaceId, id }: { editId: number; workspaceId: string; id?: string },
  cb?: ({ editId, blob }: { editId: number; blob: Blob }) => void | Promise<void>
) {
  return new ApiPoolWorker(
    async ({ api }) => {
      try {
        const blob = await api.renderAndSnapshot(editId);
        if (cb) {
          await cb({ editId, blob });
        }
      } catch (error) {
        console.error("[SnapApiPool] Worker execution failed for editId:", editId, "error:", error);
        throw error;
      }
    },
    () => createApiResource({ editId, workspaceId }),
    id
  );
}

export class ApiPoolWorker extends PoolWorker<Resource<PreviewWorkerApiType>> {}
const { PoolProvider, usePool, Context } = CreatePoolContext<ApiPoolWorker>();
export const SnapApiPoolProvider = PoolProvider;
export const useSnapApiPool = usePool;
const SnapApiContext = Context;
