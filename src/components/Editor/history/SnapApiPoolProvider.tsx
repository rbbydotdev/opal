"use client";
import { CreatePoolContext, PoolWorker, Resource } from "@/components/PoolWorker";

import * as Comlink from "comlink";

async function createApiResource({
  editId,
  workspaceId,
  filePath,
}: {
  editId: number;
  workspaceId: string;
  filePath: string;
}): Promise<Resource<Comlink.Remote<PreviewWorkerApi>>> {
  const iframe = document.createElement("iframe");
  const searchParams = new URLSearchParams({
    editId: String(editId),
    filePath,
    workspaceId,
  });
  // console.log("creating iframe with params", searchParams.toString());
  iframe.src = "/doc-preview-image.html?" + searchParams.toString();
  document.body.appendChild(iframe);
  // iframe.sandbox.add("allow-scripts", "allow-same-origin");
  await new Promise((rs) => (iframe.onload = () => rs(true)));
  console.log("iframe up");
  const api = Comlink.wrap<PreviewWorkerApi>(Comlink.windowEndpoint(iframe.contentWindow!));
  const terminate = () => {
    // console.log("removing iframe");
    // console.log(document.querySelectorAll("iframe").length);
    iframe.remove();
  };
  return { api, ready: Promise.resolve(true), terminate };
}
export function NewComlinkSnapshotPoolWorker(
  { editId, workspaceId, filePath }: { editId: number; workspaceId: string; filePath: string },
  cb: ({ editId, blob }: { editId: number; blob: Blob }) => void
) {
  return new ApiPoolWorker(
    ({ api }) => api.renderAndSnapshot(editId).then((result) => cb(result)),
    () => {
      return createApiResource({ editId, workspaceId, filePath });
    },
    (resource) => {
      console.log(typeof resource, "cleanup resource", resource);
      resource?.terminate();
    }
  );
}

export class ApiPoolWorker extends PoolWorker<Resource<PreviewWorkerApi>> {}
const { PoolProvider, usePool, Context } = CreatePoolContext<ApiPoolWorker>();
export const SnapApiPoolProvider = PoolProvider;
export const useSnapApiPool = usePool;
export const SnapApiContext = Context;
