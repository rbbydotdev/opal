"use client";
import { TreeDir, TreeDirRoot, TreeFile } from "@/clientdb/filetree";
import { Workspace, WorkspaceDAO } from "@/clientdb/Workspace";
import { NotFoundError } from "@/lib/errors";
import { AbsPath, isAncestor } from "@/lib/paths";
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
  const router = useRouter();

  useEffect(() => {
    if (currentWorkspace && filePath) {
      currentWorkspace.disk
        .readFile(filePath)
        .then(setContents)
        .catch((e) => {
          if (e instanceof NotFoundError) {
            // router.push(currentWorkspace.href);
          } else {
            throw e;
          }
        });
      //listener is currently only used with remote, since a local write will not trigger
      //a local write event, this is because the common update kind of borks mdx editor
      return currentWorkspace.disk.writeFileListener(filePath, setContents);
    }
  }, [currentWorkspace, filePath, router]);
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

export function useWorkspaceRoute() {
  const pathname = usePathname();
  const [workspaceRoute, setRouteWorkspaceInfo] = useState<WorkspaceRouteType>({
    id: null,
    path: null,
  });
  useEffect(() => {
    if (!pathname) return;
    const { workspaceId, filePath } = Workspace.parseWorkspacePath(pathname);
    if (workspaceId && workspaceId !== "new") {
      setRouteWorkspaceInfo({
        id: workspaceId ?? null,
        path: filePath ? new AbsPath(decodeURIComponent(filePath.str)) : null,
      });
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
        const newTree = new TreeDirRoot(fileTreeDir);
        setFileTree(newTree);
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
    if (!isAncestor(pathname, Workspace.rootRoute) || pathname === "/workspace/new" || !pathname) {
      return;
    }
    const ws = Workspace.fetchFromRoute(pathname).then((ws) => {
      // setCurrentWorkspace(ws);
      setCurrentWorkspace(ws);
      ws.init();
      return ws;
    });
    return () => {
      ws.then((w) => w.teardown());
    };
  }, [pathname]);

  useEffect(() => {
    if (!currentWorkspace) return;
    return currentWorkspace.disk.renameListener(({ newPath, oldPath, type }) => {
      if (
        (type === "file" && pathname === currentWorkspace.resolveFileUrl(oldPath)) ||
        (type === "dir" && isAncestor(workspaceRoute.path, oldPath.str))
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
  const router = useRouter();

  //Keep the user editor on a file which exists
  //TODO 404 page?
  useEffect(() => {
    if (!currentWorkspace) return;
    const handlePathCheck = async () => {
      if (workspaceRoute.path) {
        const exists = await currentWorkspace.disk.pathExists(workspaceRoute.path);
        if (!exists) {
          router.push(firstFile?.path ? currentWorkspace.resolveFileUrl(firstFile.path) : currentWorkspace.href);
        }
      } else if (firstFile?.path && workspaceRoute.id) {
        router.push(currentWorkspace.resolveFileUrl(firstFile.path));
      }
    };
    handlePathCheck();
  }, [workspaceRoute.path, currentWorkspace, router, firstFile?.path, workspaceRoute.id]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        firstFile,
        currentWorkspace,
        workspaceRoute,
        flatTree,
        fileTreeDir,
        isIndexed,
      }}
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
