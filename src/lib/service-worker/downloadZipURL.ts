import { AbsPath, absPath } from "@/lib/paths2";
import { SWClient } from "@/lib/service-worker/SWClient";
import z from "zod";

export function downloadZipURLParams(params: z.infer<typeof downloadZipSchema>): URLSearchParams {
  return new URLSearchParams({ ...params });
}
export const downloadZipSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("workspace"),
    dir: z.string().transform(absPath).default("/"), // no need for .optional()
    workspaceName: z.string(),
  }),
  z.object({
    type: z.literal("build"),
    diskId: z.string(), //because we want build disks to exist outside of workspaces eventually
    dir: z.string().transform(absPath).default("/"), // no need for .optional()
    workspaceName: z.string(),
  }),
]);
export function downloadWorkspaceZipURL(workspaceName: string) {
  return SWClient["download.zip"]
    .$url({
      query: {
        type: "workspace",
        dir: "/",
        workspaceName,
      },
    })
    .toString()
    .replace(origin, "");
}
export function downloadBuildZipURL(workspaceName: string, diskId: string, dir: AbsPath) {
  return SWClient["download.zip"]
    .$url({
      query: {
        type: "build",
        diskId,
        dir,
        workspaceName,
      },
    })
    .toString()
    .replace(origin, "");
}
