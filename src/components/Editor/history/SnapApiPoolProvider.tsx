import { CreatePoolContext, PoolWorker, Resource } from "@/components/PoolWorker";

import * as Comlink from "comlink";

export async function createApiResource({
  editId,
  workspaceId,
}: {
  editId: number;
  workspaceId: string;
}): Promise<Resource<Comlink.Remote<PreviewWorkerApi>>> {
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
  let api: Comlink.Remote<PreviewWorkerApi> | null = Comlink.wrap<PreviewWorkerApi>(
    Comlink.windowEndpoint(iframe.contentWindow!)
  );
  const wrefApi = new WeakRef(api);
  const wrefIframe = new WeakRef(iframe);
  const terminate = () => {
    //TODO: profile this to see if its even needed
    //me being paranoid about memory leaks
    console.debug("terminating api resource");
    (wrefIframe.deref()! || {}).src = "about:blank";
    wrefApi.deref()?.[Comlink.releaseProxy]();
    wrefIframe.deref()?.remove();
    api = null;
    iframe = null;
  };
  return { api, terminate };
}
export function NewComlinkSnapshotPoolWorker(
  { editId, workspaceId, id }: { editId: number; workspaceId: string; id?: string },
  cb?: ({ editId, blob }: { editId: number; blob: Blob }) => void
) {
  return new ApiPoolWorker(
    ({ api }) => api.renderAndSnapshot(editId).then((blob) => cb?.({ editId, blob })),
    () => createApiResource({ editId, workspaceId }),
    id
  );
}

export class ApiPoolWorker extends PoolWorker<Resource<PreviewWorkerApi>> {}
const { PoolProvider, usePool, Context } = CreatePoolContext<ApiPoolWorker>();
export const SnapApiPoolProvider = PoolProvider;
export const useSnapApiPool = usePool;
export const SnapApiContext = Context;
