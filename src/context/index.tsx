"use client";
import { TreeDir, TreeFile } from "@/clientdb/filetree";
import { Workspace, WorkspaceDAO } from "@/clientdb/Workspace";
import { useLiveQuery } from "dexie-react-hooks";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback, useContext, useEffect, useState } from "react";

export const WorkspaceContext = React.createContext<{
  fileTreeDir: TreeDir | null;
  workspaces: WorkspaceDAO[];
  isIndexed: boolean;
  firstFile: TreeFile | null;
  flatTree: string[];
  currentWorkspace: Workspace | null;
  workspaceRoute: { id: string | null; path: string | null };
}>({
  fileTreeDir: null,
  firstFile: null,
  workspaces: [],
  flatTree: [],
  isIndexed: false,
  currentWorkspace: null,
  workspaceRoute: { id: null, path: null },
});

export type WorkspaceRouteType = { id: string | null; path: string | null };

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
    const match = pathname.match(/^\/workspace\/([^/]+)(\/.*)?$/);
    if (match) {
      const [_, wsid, filePath] = match;
      if (wsid === "new") return;
      setRouteWorkspaceInfo({ id: wsid ?? null, path: filePath ?? null });
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

export function useWorkspaceFromRoute() {
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
      const currentWorkspace = (await Workspace.fromRoute(pathname)).init();

      //move into hook? or seperate place?
      currentWorkspace.disk.renameListener(({ newPath, oldPath }) => {
        if (pathname === currentWorkspace.resolveFileUrl(oldPath)) {
          router.push(currentWorkspace.resolveFileUrl(newPath));
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
export function withCurrentWorkspace<
  T extends {
    currentWorkspace: Workspace;
    fileTreeDir: TreeDir;
    workspaceRoute: WorkspaceRouteType;
    isIndexed: boolean;
    flatTree: string[];
    firstFile: TreeFile | null;
  }
>(Component: React.ComponentType<T>) {
  return function WrappedComponent(
    props: Omit<T, "isIndexed" | "currentWorkspace" | "flatTree" | "fileTreeDir" | "workspaceRoute" | "firstFile">
  ) {
    const { fileTreeDir, currentWorkspace, workspaceRoute, flatTree, isIndexed, firstFile } = useWorkspaceContext();
    if (!fileTreeDir || !currentWorkspace) return null;

    return (
      <Component
        {...(props as T)}
        workspaceRoute={workspaceRoute}
        currentWorkspace={currentWorkspace}
        fileTreeDir={fileTreeDir}
        isIndexed={isIndexed}
        firstFile={firstFile}
        flatTree={flatTree}
      />
    );
  };
}

export function useWorkspaceContext() {
  return useContext(WorkspaceContext);
}
