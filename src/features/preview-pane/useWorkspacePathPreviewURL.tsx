import { useWorkspaceRoute } from "@/context/WorkspaceContext";
import { absPath, joinPath } from "@/lib/paths2";
import { sessionIdParam, workspacePathSessionId } from "@/lib/scrollSyncUtils";

export function useWorkspacePathPreviewURL(filePathOverride?: string) {
  const { name: workspaceId, path } = useWorkspaceRoute();
  const filePath = filePathOverride || path;
  if (!workspaceId || !filePath) {
    return null;
  }

  const previewURL = joinPath(
    absPath("preview"),
    workspaceId!,
    filePath! + `?${sessionIdParam({ sessionId: workspacePathSessionId({ workspaceId, filePath }) })}`
  ) as string;
  return previewURL;
}
