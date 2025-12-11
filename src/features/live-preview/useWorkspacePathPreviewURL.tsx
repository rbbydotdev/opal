import { sessionIdParam, workspacePathSessionId } from "@/features/live-preview/scrollSyncUtils";
import { absPath, joinPath } from "@/lib/paths2";
import { useWorkspaceRoute } from "@/workspace/WorkspaceContext";

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
