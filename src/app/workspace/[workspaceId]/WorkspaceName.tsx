"use client";
import { WorkspaceContext } from "@/context";
import { useContext } from "react";

export const WorkspaceName = () => {
  const { currentWorkspace } = useContext(WorkspaceContext);
  return currentWorkspace?.name ?? null;
};
