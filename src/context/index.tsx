"use client";
import { TreeDir } from "@/clientdb/filetree";
import { Workspace, WorkspaceDAO } from "@/clientdb/Workspace";
import { useLiveQuery } from "dexie-react-hooks";
import { usePathname, useRouter } from "next/navigation";
import React, { useContext, useEffect, useState } from "react";

export const WorkspaceContext = React.createContext<{
  fileTreeDir: TreeDir | null;
  workspaces: WorkspaceDAO[];
  isIndexed: boolean;
  currentWorkspace: Workspace | null;
  workspaceRoute: { id: string | null; path: string | null };
}>({
  fileTreeDir: null,
  workspaces: [],
  isIndexed: false,
  currentWorkspace: null,
  workspaceRoute: { id: null, path: null },
});

export type WorkspaceRouteType = { id: string | null; path: string | null };

export type Workspaces = WorkspaceDAO[];

function useWorkspaceRoute() {
  const pathname = usePathname();
  const [workspaceRoute, setRouteWorkspaceInfo] = useState<WorkspaceRouteType>({
    id: null,
    path: null,
  });
  useEffect(() => {
    const match = pathname.match(/^\/workspace\/([^/]+)(\/.*)?$/);
    if (match) {
      const [_, wsid, filePath] = match;
      if (wsid === "new") return;
      setRouteWorkspaceInfo({ id: wsid ?? null, path: filePath ?? null });
    }
  }, [pathname]);
  return workspaceRoute;
}

function useWatchWorkspaceFileTree(currentWorkspace: Workspace | null) {
  const [isIndexed, setIsIndexed] = useState(currentWorkspace?.isIndexed ?? false);
  const [fileTreeDir, setFileTree] = useState<TreeDir | null>(null);
  useEffect(() => {
    if (currentWorkspace) {
      return currentWorkspace.watchFileTree((fileTreeDir: TreeDir) => {
        setFileTree({ ...fileTreeDir });
        if (!isIndexed) setIsIndexed(currentWorkspace.isIndexed);
      });
    }
  }, [currentWorkspace, isIndexed]);
  return { fileTreeDir, isIndexed };
}

function useLiveWorkspaces() {
  const [workspaces, setWorkspaces] = useState<WorkspaceDAO[]>([]);
  useLiveQuery(async () => {
    const wrkspcs = await WorkspaceDAO.all();
    setWorkspaces(wrkspcs);
  }, [setWorkspaces]);
  return workspaces;
}

function useWorkspaceFromRoute() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  useEffect(() => {
    let tearDownFn: (() => void) | null = null;
    const setupWorkspace = async () => {
      if (!pathname.startsWith(Workspace.rootRoute) || pathname === "/workspace/new") {
        return;
      }
      //creates workspace from route
      const currentWorkspace = await Workspace.fromRoute(pathname);
      //move into hook? or seperate place?
      currentWorkspace.disk.onRename(({ newPath, oldPath }) => {
        if (pathname === currentWorkspace.resolveFileUrl(oldPath)) {
          router.push(currentWorkspace.resolveFileUrl(newPath));
        } else {
        }
      });

      setCurrentWorkspace(currentWorkspace);
      tearDownFn = currentWorkspace.teardown;
    };
    setupWorkspace();
    return () => {
      if (tearDownFn) tearDownFn();
    };
  }, [pathname, router, setCurrentWorkspace]);
  return currentWorkspace;
}

export const WorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const workspaces = useLiveWorkspaces();
  const workspaceRoute = useWorkspaceRoute();
  const currentWorkspace = useWorkspaceFromRoute();
  const { fileTreeDir, isIndexed } = useWatchWorkspaceFileTree(currentWorkspace);

  return (
    <WorkspaceContext.Provider value={{ workspaces, currentWorkspace, workspaceRoute, fileTreeDir, isIndexed }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

//Helper to delay rendering of child components until the current workspace is loaded
export function withCurrentWorkspace<
  T extends {
    currentWorkspace: Workspace;
    fileTreeDir: TreeDir;
    workspaceRoute: WorkspaceRouteType;
    isIndexed: boolean;
  }
>(Component: React.ComponentType<T>) {
  return function WrappedComponent(
    props: Omit<T, "isIndexed" | "currentWorkspace" | "fileTreeDir" | "workspaceRoute">
  ) {
    const { fileTreeDir, currentWorkspace, workspaceRoute, isIndexed } = useWorkspaceContext();
    if (!fileTreeDir || !currentWorkspace) return null;

    return (
      <Component
        {...(props as T)}
        workspaceRoute={workspaceRoute}
        currentWorkspace={currentWorkspace}
        fileTreeDir={fileTreeDir}
        isIndexed={isIndexed}
      />
    );
  };
}

export function useWorkspaceContext() {
  return useContext(WorkspaceContext);
}
