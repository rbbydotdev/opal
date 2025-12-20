import { useWatchViewMode } from "@/editor/view-mode/useWatchViewMode";
import { useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { useLocation } from "@tanstack/react-router";

export function useEditorKey() {
  const { path } = useWorkspaceRoute();
  const { searchStr } = useLocation();
  const [viewMode] = useWatchViewMode();
  return path + "|" + searchStr + "|" + viewMode;
}
