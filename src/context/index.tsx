"use client";
import { WorkspaceRecord } from "@/clientdb/Workspace";
import { ClientDb } from "@/clientdb/instance";
import { useLiveQuery } from "dexie-react-hooks";
import { usePathname } from "next/navigation";
import React, { useMemo, useState } from "react";

export const WorkspaceContext = React.createContext<{
  workspaces: WorkspaceRecord[];
  currentWorkspace: WorkspaceRecord | null;
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

  useLiveQuery(async () => {
    const wrkspcs = await ClientDb.workspaces.toArray();
    setWorkspaces(wrkspcs);
  }, [setWorkspaces]);

  const currentWorkspace = useMemo(
    () => (!pathname.startsWith("/workspace") ? null : workspaces.find((w) => pathname.startsWith(w.href)) ?? null),
    [pathname, workspaces]
  );

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
  const { workspaces } = React.useContext(WorkspaceContext);
  return workspaces;
};
