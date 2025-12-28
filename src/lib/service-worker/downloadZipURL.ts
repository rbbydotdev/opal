import { AbsPath, absPath } from "@/lib/paths2";
import z from "zod";

export function downloadZipURLParams(params: z.infer<typeof downloadZipSchema>): URLSearchParams {
  return new URLSearchParams({ ...params });
}
export const downloadZipSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("workspace"),
    dir: z.string().transform(absPath).default("/"), // no need for .optional()
  }),
  z.object({
    type: z.literal("build"),
    diskId: z.string(), //because we want build disks to exist outside of workspaces eventually
    dir: z.string().transform(absPath).default("/"), // no need for .optional()
  }),
]);
export function downloadWorkspaceZipURL(workspaceName?: string) {
  const origin = window.location.origin;
  const downloadUrl = new URL("/download.zip", origin);
  downloadUrl.search = downloadZipURLParams({ type: "workspace", dir: absPath("/") }).toString();
  if (workspaceName) {
    downloadUrl.searchParams.set("workspaceName", workspaceName);
  }
  return downloadUrl.toString().replace(origin, "");
}
export function downloadBuildZipURL(diskId: string, dir: AbsPath) {
  const origin = window.location.origin;
  const downloadUrl = new URL("/download.zip", origin);
  downloadUrl.search = downloadZipURLParams({ type: "build", diskId, dir }).toString();
  return downloadUrl.toString().replace(origin, "");
}
