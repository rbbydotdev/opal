import { useResolvePathForPreview } from "@/features/live-preview/useResolvePathForPreview";
import { useWorkspacePathPreviewURL } from "@/features/live-preview/useWorkspacePathPreviewURL";
import { AbsPath } from "@/lib/paths2";
import { Workspace } from "@/workspace/Workspace";

export function usePreviewPaneProps({ path, currentWorkspace }: { path: AbsPath | null; currentWorkspace: Workspace }) {
  const {
    setPreviewNode,
    choicePreviewNode: previewNode,
    reset,
  } = useResolvePathForPreview({ path, currentWorkspace });
  const previewURL = useWorkspacePathPreviewURL(previewNode?.path);
  return {
    setPreviewNode,
    previewNode,
    previewURL,
    canShow: !!previewNode?.isPreviewable(),
    reset,
  };
}
