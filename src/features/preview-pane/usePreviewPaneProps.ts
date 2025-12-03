import { useResolvePathForPreview } from "@/features/preview-pane/useResolvePathForPreview";
import { useWorkspacePathPreviewURL } from "@/features/preview-pane/useWorkspacePathPreviewURL";
import { AbsPath } from "@/lib/paths2";
import { Workspace } from "@/workspace/Workspace";

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
