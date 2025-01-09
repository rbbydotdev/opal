"use client";
import { TreeDir, TreeFile } from "@/clientdb/filetree";
import { Workspace, WorkspaceDAO } from "@/clientdb/Workspace";
import { AbsPath } from "@/lib/paths";
import { useLiveQuery } from "dexie-react-hooks";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback, useContext, useEffect, useState } from "react";

const defaultWorkspaceContext = {
  fileTreeDir: null as TreeDir | null,
  firstFile: null as TreeFile | null,
  workspaces: [] as WorkspaceDAO[],
  flatTree: [] as string[],
  isIndexed: false,
  currentWorkspace: null as Workspace | null,
  workspaceRoute: { id: null, path: null } as WorkspaceRouteType,
};

type DeepNonNullable<T extends object, K extends keyof T = never> = {
  [P in keyof T]: P extends K
    ? T[P]
    : NonNullable<T[P]> extends T
    ? DeepNonNullable<NonNullable<T[P]>, K>
    : NonNullable<T[P]>;
};
type NonNullWorkspaceContext = DeepNonNullable<typeof defaultWorkspaceContext, "firstFile">;

export type WorkspaceContextType = typeof defaultWorkspaceContext;

export const WorkspaceContext = React.createContext<WorkspaceContextType>(defaultWorkspaceContext);

export type WorkspaceRouteType = { id: string | null; path: AbsPath | null };

export type Workspaces = WorkspaceDAO[];

export function useCurrentFilepath() {
  const { currentWorkspace } = useWorkspaceContext();
  const { path: filePath } = useWorkspaceRoute();
  const [contents, setContents] = useState<null | string>(null);

  useEffect(() => {
    if (currentWorkspace && filePath) {
      currentWorkspace.disk.readFile(filePath).then(setContents);
      //listener is currently only used with remote, since a local write will not trigger
      //a local write event, this is because the common update kind of borks mdx editor
      return currentWorkspace.disk.writeFileListener(filePath, setContents);
    }
  }, [currentWorkspace, filePath]);
  const updateContents = useCallback(
    (updates: string) => {
      if (filePath && currentWorkspace) {
        currentWorkspace?.disk.writeFile(filePath, updates);
      }
    },
    [currentWorkspace, filePath]
  );
  return { filePath, contents, updateContents };
}

function useWorkspaceRoute() {
  const pathname = usePathname();
  const [workspaceRoute, setRouteWorkspaceInfo] = useState<WorkspaceRouteType>({
    id: null,
    path: null,
  });
  useEffect(() => {
    if (!pathname) return;
    const { workspaceId, filePath } = Workspace.parseWorkspacePath(pathname);
    if (workspaceId && workspaceId !== "new") {
      setRouteWorkspaceInfo({ id: workspaceId ?? null, path: filePath ?? null });
    }
  }, [pathname]);
  return workspaceRoute;
}

export function useWatchWorkspaceFileTree(currentWorkspace: Workspace | null) {
  const [isIndexed, setIsIndexed] = useState(currentWorkspace?.isIndexed ?? false);
  const [fileTreeDir, setFileTree] = useState<TreeDir | null>(null);
  const [firstFile, setFirstFile] = useState<TreeFile | null>(null);
  const [flatTree, setFlatTree] = useState<string[]>([]);
  useEffect(() => {
    if (currentWorkspace) {
      return currentWorkspace.watchDisk((fileTreeDir: TreeDir) => {
        if (!isIndexed) setIsIndexed(currentWorkspace.isIndexed);
        setFileTree({ ...fileTreeDir });
        setFirstFile(currentWorkspace.getFirstFile());
        setFlatTree(currentWorkspace.getFlatDirTree());
      });
    }
  }, [currentWorkspace, isIndexed]);
  return { fileTreeDir, flatTree, isIndexed, firstFile };
}

export function useLiveWorkspaces() {
  const [workspaces, setWorkspaces] = useState<WorkspaceDAO[]>([]);
  useLiveQuery(async () => {
    const wrkspcs = await WorkspaceDAO.all();
    setWorkspaces(wrkspcs);
  }, [setWorkspaces]);
  return workspaces;
}

//There can be only one!
export function useWorkspaceFromRoute() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const workspaceRoute = useWorkspaceRoute();

  useEffect(() => {
    if (!pathname.startsWith(Workspace.rootRoute) || pathname === "/workspace/new" || !pathname) {
      return;
    }
    const ws = Workspace.fetchFromRoute(pathname).then((ws) => {
      setCurrentWorkspace(ws);
      ws.init();
      return ws;
    });
    return () => {
      ws.then((w) => {
        w.teardown();
      });
    };
  }, [pathname]);

  useEffect(() => {
    if (!currentWorkspace) return;
    return currentWorkspace.disk.renameListener(({ newPath, oldPath, type }) => {
      if (
        (type === "file" && pathname === currentWorkspace.resolveFileUrl(oldPath)) ||
        (type === "dir" && workspaceRoute.path?.startsWith(oldPath.str))
      ) {
        router.push(currentWorkspace.replaceUrlPath(pathname, oldPath, newPath));
      }
    });
  }, [currentWorkspace, pathname, router, workspaceRoute.path]);

  return currentWorkspace;
}

export const WorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const workspaces = useLiveWorkspaces();
  const workspaceRoute = useWorkspaceRoute();
  const currentWorkspace = useWorkspaceFromRoute();
  const { fileTreeDir, isIndexed, firstFile, flatTree } = useWatchWorkspaceFileTree(currentWorkspace);

  return (
    <WorkspaceContext.Provider
      value={{ workspaces, firstFile, currentWorkspace, workspaceRoute, flatTree, fileTreeDir, isIndexed }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

//Helper to delay rendering of child components until the current workspace is loaded
export function withCurrentWorkspace<T extends NonNullWorkspaceContext>(Component: React.ComponentType<T>) {
  return function WrappedComponent(props: Omit<T, keyof NonNullWorkspaceContext>) {
    const context = useWorkspaceContext();
    if (!context.fileTreeDir || !context.currentWorkspace) return null;

    return <Component {...(props as T)} {...context} />;
  };
}

export function useWorkspaceContext() {
  return useContext(WorkspaceContext);
}
