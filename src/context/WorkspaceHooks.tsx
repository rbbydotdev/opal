"use client";
import { NullWorkspace } from "@/Db/NullWorkspace";
import { Workspace } from "@/Db/Workspace";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { TreeDir, TreeDirRoot } from "@/lib/FileTree/TreeNode";
import { getMimeType } from "@/lib/mimeType";
import { AbsPath } from "@/lib/paths2";
import { useLiveQuery } from "dexie-react-hooks";
import mime from "mime-types";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";

export const NULL_WORKSPACE = new NullWorkspace();
const NULL_TREE_ROOT = new TreeDirRoot();

const defaultWorkspaceContext = {
  fileTreeDir: NULL_TREE_ROOT,
  workspaces: [] as WorkspaceDAO[],
  flatTree: [] as string[],
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
export type WorkspaceContextType = typeof defaultWorkspaceContext;

export const WorkspaceContext = React.createContext<WorkspaceContextType>(defaultWorkspaceContext);

export type WorkspaceRouteType = { id: string | null; path: AbsPath | null };

export type Workspaces = WorkspaceDAO[];

export function useFileContents() {
  const { currentWorkspace } = useWorkspaceContext();
  const { path: filePath } = useWorkspaceRoute();
  const [contents, setContents] = useState<Uint8Array<ArrayBufferLike> | string | null>(null);
  const [mimeType, setMimeType] = useState<null | string>(null);
  const [error, setError] = useState<null | Error>(null);
  const router = useRouter();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => clearTimeout(debounceRef.current!);
  }, []);

  const updateContents = useCallback(
    (updates: string) => {
      if (filePath && currentWorkspace) {
        void currentWorkspace?.disk.writeFile(filePath, updates);
      }
    },
    [currentWorkspace, filePath]
  );

  const debouncedUpdate = useCallback(
    (content: string | null) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        if (content !== null) {
          updateContents(String(content));
        }
      }, 250);
    },
    [updateContents]
  );

  useEffect(() => {
    const fetchFileContents = async () => {
      if (currentWorkspace && filePath) {
        try {
          setContents(await currentWorkspace.disk.readFile(filePath));
          setMimeType(getMimeType(filePath));
          setError(null);
        } catch (error) {
          setError(error as Error);
        }
        //listener is currently only used with remote, since a local write will not trigger
        //a local write event, this is because the common update kind of borks mdx editor
        return currentWorkspace.disk.updateListener(filePath, setContents);
      }
    };

    void fetchFileContents();
  }, [currentWorkspace, filePath, router]);

  return { error, filePath, contents: String(contents), mimeType, updateContents, debouncedUpdate };
}
export function useCurrentFilepath() {
  const { currentWorkspace } = useWorkspaceContext();
  const { path: filePath } = useWorkspaceRoute();

  if (filePath === null || currentWorkspace.isNull) {
    return { filePath: null, mimeType: null, isImage: null };
  }
  const mimeType = mime.lookup(filePath) || "";

  return { filePath, mimeType, isImage: mimeType.startsWith("image/") };
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
        path: filePath ?? null,
      });
    }
  }, [pathname]);
  return workspaceRoute;
}

export function useWatchWorkspaceFileTree(currentWorkspace: Workspace) {
  const [fileTreeDir, setFileTree] = useState<TreeDirRoot>(NULL_TREE_ROOT);
  const [flatTree, setFlatTree] = useState<string[]>([]);

  useEffect(() => {
    if (currentWorkspace) {
      return currentWorkspace.watchDisk((fileTreeDir: TreeDir) => {
        const newTree = new TreeDirRoot(fileTreeDir);
        setFileTree(newTree);
        setFlatTree(currentWorkspace.getFlatTree());
      });
    }
  }, [currentWorkspace]);
  return { fileTreeDir, flatTree };
}

export function useLiveWorkspaces() {
  const [workspaces, setWorkspaces] = useState<WorkspaceDAO[]>([]);
  useLiveQuery(async () => {
    const wrkspcs = await WorkspaceDAO.all();
    setWorkspaces(wrkspcs);
  }, [setWorkspaces]);
  return workspaces;
}

export function useWorkspaceContext() {
  return useContext(WorkspaceContext);
}
