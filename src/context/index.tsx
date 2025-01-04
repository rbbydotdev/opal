"use client";
import { TreeDir } from "@/clientdb/filetree";
import { Workspace, WorkspaceDAO } from "@/clientdb/Workspace";
import { useLiveQuery } from "dexie-react-hooks";
import { usePathname } from "next/navigation";
import React, { useContext, useEffect, useMemo, useState } from "react";

export const WorkspaceContext = React.createContext<{
  fileTree: TreeDir | null;
  workspaces: WorkspaceDAO[];
  currentWorkspace: Workspace | null;
  workspaceRoute: { id: string | null; path: string | null };
  actions: {
    addWorkspace: (workspace: WorkspaceDAO) => void;
    removeWorkspace: (workspace: WorkspaceDAO) => void;
  };
}>({
  fileTree: null,
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
  const [fileTree, setFileTree] = useState<TreeDir | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

  const [workspaceRoute, setRouteWorkspaceInfo] = useState<WorkspaceRouteType>({
    id: null,
    path: null,
  });
  useEffect(() => {
    if (currentWorkspace) {
      currentWorkspace.watchFileTree(() => {
        setFileTree(currentWorkspace.getFileTree());
      });
    }
  }, [currentWorkspace]);
  useEffect(() => {
    const match = pathname.match(/^\/workspace\/([^/]+)(\/.*)?$/);
    if (match) {
      const [_, wsid, filePath] = match;
      if (wsid === "new") return;
      setRouteWorkspaceInfo({ id: wsid ?? null, path: filePath ?? null });
    }
  }, [pathname]);

  useLiveQuery(async () => {
    const wrkspcs = await WorkspaceDAO.all();
    setWorkspaces(wrkspcs);
  }, [setWorkspaces]);

  useEffect(() => {
    let tearDownFn: (() => void) | null = null;
    const setupWorkspace = async () => {
      if (!pathname.startsWith(Workspace.rootRoute) || pathname === "/workspace/new") {
        return;
      }
      const currentWorkspace = await Workspace.fromRoute(pathname);
      setCurrentWorkspace(currentWorkspace);
      tearDownFn = currentWorkspace.teardown;
    };
    setupWorkspace();
    return () => {
      if (tearDownFn) tearDownFn();
    };
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
    <WorkspaceContext.Provider value={{ workspaces, actions, currentWorkspace, workspaceRoute, fileTree }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspaces = () => {
  return React.useContext(WorkspaceContext);
};

export const useCurrentWorkspace = () => {
  const { currentWorkspace } = useWorkspaces();
  return currentWorkspace;
};

//Helper to delay rendering of child components until the current workspace is loaded
export function withCurrentWorkspace<
  T extends {
    currentWorkspace: Workspace;
    fileTree: TreeDir;
    workspaceRoute: WorkspaceRouteType;
  }
>(Component: React.ComponentType<T>) {
  return function WrappedComponent(props: Omit<T, "currentWorkspace" | "fileTree" | "workspaceRoute">) {
    const { fileTree, currentWorkspace, workspaceRoute } = useContext(WorkspaceContext);
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
