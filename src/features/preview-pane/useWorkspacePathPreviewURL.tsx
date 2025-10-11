import { sessionIdParam, workspacePathSessionId } from "@/components/ScrollSync";
import { useWorkspaceRoute } from "@/context/WorkspaceContext";
import { absPath, joinPath } from "@/lib/paths2";

export function useWorkspacePathPreviewURL(filePathOverride?: string) {
  const { id: workspaceId, path } = useWorkspaceRoute();
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
