"use client";
import { NullWorkspace, Workspace, WorkspaceDAO } from "@/Db/Workspace";
import { TreeDir, TreeDirRoot, TreeFile } from "@/lib/FileTree/TreeNode";
import { getMimeType } from "@/lib/mimeType";
import { AbsPath, isAncestor } from "@/lib/paths";
import { useLiveQuery } from "dexie-react-hooks";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback, useContext, useEffect, useState } from "react";

const NULL_WORKSPACE = new NullWorkspace();
const NULL_TREE_ROOT = new TreeDirRoot();

const defaultWorkspaceContext = {
  fileTreeDir: NULL_TREE_ROOT,
  firstFile: null as TreeFile | null,
  workspaces: [] as WorkspaceDAO[],
  flatTree: [] as string[],
  isIndexed: false,
  currentWorkspace: NULL_WORKSPACE,
  workspaceRoute: { id: null, path: null } as WorkspaceRouteType,
};

export type DeepNonNullable<T extends object, K extends keyof T = never> = {
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
  const [contents, setContents] = useState<Uint8Array<ArrayBufferLike> | string | null>(null);
  const [mimeType, setMimeType] = useState<null | string>(null);
  const [error, setError] = useState<null | Error>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchFileContents = async () => {
      if (currentWorkspace && filePath) {
        try {
          const contents = await currentWorkspace.disk.readFile(filePath);
          setContents(contents); //TODO!
          setMimeType(getMimeType(filePath.str));
          setError(null);
        } catch (error) {
          setError(error as Error);
        }
        //listener is currently only used with remote, since a local write will not trigger
        //a local write event, this is because the common update kind of borks mdx editor
        return currentWorkspace.disk.writeFileListener(filePath, setContents);
      }
    };

    void fetchFileContents();
  }, [currentWorkspace, filePath, router]);

  const updateContents = useCallback(
    (updates: string) => {
      if (filePath && currentWorkspace) {
        void currentWorkspace?.disk.writeFile(filePath, updates);
      }
    },
    [currentWorkspace, filePath]
  );
  return { error, filePath, contents, updateContents, mimeType };
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

export function useWatchWorkspaceFileTree(currentWorkspace: Workspace) {
  const [isIndexed, setIsIndexed] = useState(currentWorkspace?.isIndexed ?? false);
  const [fileTreeDir, setFileTree] = useState<TreeDirRoot>(NULL_TREE_ROOT);
  const [firstFile, setFirstFile] = useState<TreeFile | null>(null);
  const [flatTree, setFlatTree] = useState<string[]>([]);

  useEffect(() => {
    if (currentWorkspace) {
      return currentWorkspace.watchDisk((fileTreeDir: TreeDir) => {
        if (!isIndexed) setIsIndexed(currentWorkspace.isIndexed);
        const newTree = new TreeDirRoot(fileTreeDir);
        setFileTree(newTree);
        void currentWorkspace.getFirstFile().then((ff) => setFirstFile(ff));
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
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(NULL_WORKSPACE);
  const workspaceRoute = useWorkspaceRoute();
  const { workspaceId } = Workspace.parseWorkspacePath(pathname);

  useEffect(() => {
    if (workspaceId === "new" || !workspaceId) {
      setCurrentWorkspace(NULL_WORKSPACE);
      return;
    }
    const workspace = WorkspaceDAO.fetchFromNameAndInit(workspaceId).then((ws) => {
      setCurrentWorkspace(ws);
      console.debug("Initialize Workspace");
      return ws;
    });
    return () => {
      void workspace.then((ws) => ws.teardown());
    };
  }, [workspaceId]);

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

  //pathname is sync current workspace is async update therefor if out of sync return null
  if (currentWorkspace?.href && !pathname.startsWith(currentWorkspace?.href)) return new NullWorkspace();
  return currentWorkspace;
}

export const WorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const workspaces = useLiveWorkspaces();
  const workspaceRoute = useWorkspaceRoute();
  const currentWorkspace = useWorkspaceFromRoute();
  const { fileTreeDir, isIndexed, firstFile, flatTree } = useWatchWorkspaceFileTree(currentWorkspace);

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

// Helper to delay rendering of child components until the current workspace is loaded
export function withCurrentWorkspace<T extends NonNullWorkspaceContext>(Component: React.ComponentType<T>) {
  return function WrappedComponent(props: Omit<T, keyof NonNullWorkspaceContext>) {
    const context = useWorkspaceContext();
    return <Component {...(props as T)} {...context} />;
  };
}

export function useWorkspaceContext() {
  return useContext(WorkspaceContext);
}
