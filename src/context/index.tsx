"use client";
import { FileTree } from "@/clientdb/filetree";
import { Workspace, WorkspaceDAO } from "@/clientdb/Workspace";
import { useLiveQuery } from "dexie-react-hooks";
import { usePathname } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

export const WorkspaceContext = React.createContext<{
  workspaces: WorkspaceDAO[];
  currentWorkspace: Workspace | null;
  workspaceRoute: { id: string | null; path: string | null };
  actions: {
    addWorkspace: (workspace: WorkspaceDAO) => void;
    removeWorkspace: (workspace: WorkspaceDAO) => void;
  };
}>({
  workspaces: [],
  currentWorkspace: null,
  workspaceRoute: { id: null, path: null },
  actions: {
    addWorkspace: () => {},
    removeWorkspace: () => {},
  },
});

export type WorkspaceRouteType = { id: string | null; path: string | null };

export type Workspaces = WorkspaceDAO[];

export const WorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const [workspaces, setWorkspaces] = useState<WorkspaceDAO[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

  const [workspaceRoute, setRouteWorkspaceInfo] = useState<WorkspaceRouteType>({
    id: null,
    path: null,
  });
  useEffect(() => {
    const match = pathname.match(/^\/workspace\/([^/]+)(\/.*)?$/);
    if (match) {
      const [_, wsid, filePath] = match;
      setRouteWorkspaceInfo({ id: wsid ?? null, path: filePath ?? null });
    }
  }, [pathname]);

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
    <WorkspaceContext.Provider value={{ workspaces, actions, currentWorkspace, workspaceRoute }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspaces = () => {
  return React.useContext(WorkspaceContext);
};

export const useCurrentWorkspaceData = () => {
  const { currentWorkspace, workspaceRoute } = useWorkspaces();
  const [data, setData] = useState<{
    currentWorkspace: Workspace | null;
    fileTree: FileTree | null;
    workspaceRoute: WorkspaceRouteType;
  }>({ currentWorkspace: null, fileTree: null, workspaceRoute });
  useEffect(() => {
    const fetchData = async () => {
      if (!currentWorkspace) return;
      const fileTree = await currentWorkspace.fileTree;
      setData({ currentWorkspace, fileTree, workspaceRoute });
    };
    fetchData();
  }, [currentWorkspace, workspaceRoute]);
  return data;
};

export const useCurrentWorkspace = () => {
  const { currentWorkspace } = useWorkspaces();
  return currentWorkspace;
};

//Helper to delay rendering of child components until the current workspace is loaded
export function withCurrentWorkspace<
  T extends {
    currentWorkspace: Workspace;
    fileTree: Awaited<Workspace["fileTree"]>;
    workspaceRoute: WorkspaceRouteType;
  }
>(Component: React.ComponentType<T>) {
  return function WrappedComponent(props: Omit<T, "currentWorkspace" | "fileTree" | "workspaceRoute">) {
    const { fileTree, currentWorkspace, workspaceRoute } = useCurrentWorkspaceData();
    if (!fileTree || !currentWorkspace) return null;
    return (
      <Component
        {...(props as T)}
        workspaceRoute={workspaceRoute}
        currentWorkspace={currentWorkspace}
        fileTree={fileTree}
      />
    );
  };
}
