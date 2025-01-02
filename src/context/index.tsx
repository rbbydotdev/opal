"use client";
import { Workspace, WorkspaceDAO } from "@/clientdb/Workspace";
import { useLiveQuery } from "dexie-react-hooks";
import { usePathname } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

export const WorkspaceContext = React.createContext<{
  workspaces: WorkspaceDAO[];
  currentWorkspace: Workspace | null;
  actions: {
    addWorkspace: (workspace: WorkspaceDAO) => void;
    removeWorkspace: (workspace: WorkspaceDAO) => void;
  };
}>({
  workspaces: [],
  currentWorkspace: null,
  actions: {
    addWorkspace: () => {},
    removeWorkspace: () => {},
  },
});

export type Workspaces = WorkspaceDAO[];
export const WorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const [workspaces, setWorkspaces] = useState<WorkspaceDAO[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

  useLiveQuery(async () => {
    const wrkspcs = await WorkspaceDAO.all();
    setWorkspaces(wrkspcs);
  }, [setWorkspaces]);

  useEffect(() => {
    if (!pathname.startsWith(Workspace.rootRoute) || pathname === "/workspace/new") return;
    Workspace.fromRoute(pathname).then(setCurrentWorkspace);
  }, [pathname, workspaces, setCurrentWorkspace]);

  const actions = useMemo(
    () => ({
      addWorkspace: (workspace: WorkspaceDAO) => {
        setWorkspaces([...workspaces, workspace]);
      },
      removeWorkspace: (workspace: WorkspaceDAO) => {
        setWorkspaces(workspaces.filter((w) => w.guid !== workspace.guid));
      },
    }),
    [workspaces]
  );

  return (
    <WorkspaceContext.Provider value={{ workspaces, actions, currentWorkspace }}>{children}</WorkspaceContext.Provider>
  );
};

export const useWorkspaces = () => {
  return React.useContext(WorkspaceContext);
};

export const useCurrentWorkspace = () => {
  const { currentWorkspace } = useWorkspaces();
  return currentWorkspace;
};

export function withCurrentWorkspace<T extends { currentWorkspace: Workspace }>(Component: React.ComponentType<T>) {
  return function WrappedComponent(props: Omit<T, "currentWorkspace">) {
    const currentWorkspace = useCurrentWorkspace();
    if (!currentWorkspace) return null;
    return <Component {...(props as T)} currentWorkspace={currentWorkspace} />;
  };
}
