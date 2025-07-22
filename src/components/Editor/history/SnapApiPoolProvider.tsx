"use client";
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
  // iframe.style = "visibility: hidden; position: absolute; width: 0; height: 0; border: none;";
  const searchParams = new URLSearchParams({
    editId: String(editId),
    filePath: "/preview-doc.md",
    workspaceId,
  });
  // console.log("creating iframe with params", searchParams.toString());
  iframe.src = "/doc-preview-image.html?" + searchParams.toString();
  document.body.appendChild(iframe);
  // iframe.sandbox.add("allow-scripts", "allow-same-origin");
  await new Promise((rs) => (iframe!.onload = () => rs(true)));
  console.log("iframe up");
  let api: Comlink.Remote<PreviewWorkerApi> | null = Comlink.wrap<PreviewWorkerApi>(
    Comlink.windowEndpoint(iframe.contentWindow!)
  );
  const wrefApi = new WeakRef(api);
  const wrefIframe = new WeakRef(iframe);
  const terminate = () => {
    console.log("terminating api resource");
    // api?.[Comlink.releaseProxy]();
    // iframe?.remove();
    (wrefIframe.deref()! || {}).src = "about:blank";
    wrefApi.deref()?.[Comlink.releaseProxy]();
    wrefIframe.deref()?.remove();
    api = null;
    // iframe!.remove();
    iframe = null;
  };
  return { api, terminate };
}
export function NewComlinkSnapshotPoolWorker(
  { editId, workspaceId, id }: { editId: number; workspaceId: string; id?: string },
  cb?: ({ editId, blob }: { editId: number; blob: Blob }) => void
) {
  return new ApiPoolWorker(
    ({ api }) =>
      api.renderAndSnapshot(editId).then((blob) => {
        if (cb) cb({ editId, blob });
      }),
    () => createApiResource({ editId, workspaceId }),
    id
  );
}

export class ApiPoolWorker extends PoolWorker<Resource<PreviewWorkerApi>> {}
const { PoolProvider, usePool, Context } = CreatePoolContext<ApiPoolWorker>();
export const SnapApiPoolProvider = PoolProvider;
export const useSnapApiPool = usePool;
export const SnapApiContext = Context;
