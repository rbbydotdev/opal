"use client";
import { Workspace, WorkspaceRecord } from "@/clientdb/Workspace";
import { ClientDb } from "@/clientdb/instance";
import { useLiveQuery } from "dexie-react-hooks";
import { usePathname } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

export const WorkspaceContext = React.createContext<{
  workspaces: WorkspaceRecord[];
  currentWorkspace: Workspace | null;
  actions: {
    addWorkspace: (workspace: WorkspaceRecord) => void;
    removeWorkspace: (workspace: WorkspaceRecord) => void;
  };
}>({
  workspaces: [],
  currentWorkspace: null,
  actions: {
    addWorkspace: () => {},
    removeWorkspace: () => {},
  },
});

export type Workspaces = WorkspaceRecord[];
export const WorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

  useLiveQuery(async () => {
    const wrkspcs = await ClientDb.workspaces.toArray();
    setWorkspaces(wrkspcs);
  }, [setWorkspaces]);

  useEffect(() => {
    const cur = !pathname.startsWith("/workspace") ? null : workspaces.find((w) => pathname.startsWith(w.href)) ?? null;
    if (cur) new Workspace(cur).loadFromDbAndMountDisk().then(setCurrentWorkspace);
  }, [pathname, workspaces, setCurrentWorkspace]);

  const actions = useMemo(
    () => ({
      addWorkspace: (workspace: WorkspaceRecord) => {
        setWorkspaces([...workspaces, workspace]);
      },
      removeWorkspace: (workspace: WorkspaceRecord) => {
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
export const useCurrentFileTree = () => {
  const { currentWorkspace } = useWorkspaces();
  if (!currentWorkspace) return null;
  return currentWorkspace?.disk?.fileTree ?? null;
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
