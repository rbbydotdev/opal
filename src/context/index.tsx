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

export const useCurrentWorkspaceData = () => {
  const { currentWorkspace } = useWorkspaces();
  const [data, setData] = useState<{
    currentWorkspace: Workspace | null;
    fileTree: Awaited<Workspace["fileTree"]> | null;
  }>({ currentWorkspace: null, fileTree: null });
  useEffect(() => {
    const fetchData = async () => {
      if (!currentWorkspace) return;
      const fileTree = await currentWorkspace.fileTree;
      setData({ currentWorkspace, fileTree });
    };
    fetchData();
  }, [currentWorkspace]);
  return data;
};

export const useCurrentWorkspace = () => {
  const { currentWorkspace } = useWorkspaces();
  return currentWorkspace;
};

export function withCurrentWorkspace<
  T extends { currentWorkspace: Workspace; fileTree: Awaited<Workspace["fileTree"]> }
>(Component: React.ComponentType<T>) {
  return function WrappedComponent(props: Omit<T, "currentWorkspace" | "fileTree">) {
    const { fileTree, currentWorkspace } = useCurrentWorkspaceData();
    if (!fileTree || !currentWorkspace) return null;
    return <Component {...(props as T)} currentWorkspace={currentWorkspace} fileTree={fileTree} />;
  };
}
