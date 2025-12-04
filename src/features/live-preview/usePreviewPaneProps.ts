import { useResolvePathForPreview } from "@/features/live-preview/useResolvePathForPreview";
import { useWorkspacePathPreviewURL } from "@/features/live-preview/useWorkspacePathPreviewURL";
import { Workspace } from "@/lib/events/Workspace";
import { AbsPath } from "@/lib/paths2";

export function usePreviewPaneProps({ path, currentWorkspace }: { path: AbsPath | null; currentWorkspace: Workspace }) {
  const { setPreviewNode, previewNode } = useResolvePathForPreview({ path, currentWorkspace });
  const previewURL = useWorkspacePathPreviewURL(previewNode?.path);
  return {
    setPreviewNode,
    previewNode,
    previewURL,
    canShow: !!previewNode?.isPreviewable(),
  };
}
