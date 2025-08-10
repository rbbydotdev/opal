import { useWorkspaceContext } from "@/context/WorkspaceHooks";

export const WorkspaceStatus = () => {
  const { currentWorkspace, workspaceRoute } = useWorkspaceContext();
  if (!currentWorkspace) return "";
  return `${currentWorkspace.name} ${workspaceRoute.path ? " - " + workspaceRoute.path : ""}`;
};
