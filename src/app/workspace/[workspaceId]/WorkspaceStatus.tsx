"use client";

import { useWorkspaceContext } from "@/context";

export const WorkspaceStatus = () => {
  const { currentWorkspace, workspaceRoute } = useWorkspaceContext();
  if (!currentWorkspace) return null;
  return currentWorkspace.name + " - " + workspaceRoute.path;
};
