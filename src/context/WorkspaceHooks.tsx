"use client";
import { NullWorkspace } from "@/Db/NullWorkspace";
import { SpecialDirs } from "@/Db/SpecialDirs";
import { Workspace } from "@/Db/Workspace";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { NULL_TREE_ROOT, TreeDir, TreeDirRoot, TreeNode } from "@/lib/FileTree/TreeNode";
import { getMimeType } from "@/lib/mimeType";
import { AbsPath } from "@/lib/paths2";
import { useLiveQuery } from "dexie-react-hooks";
import mime from "mime-types";
import { usePathname, useRouter } from "next/navigation";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";

export const NULL_WORKSPACE = new NullWorkspace();

const defaultWorkspaceContext = {
  fileTreeDir: NULL_TREE_ROOT,
  workspaces: [] as WorkspaceDAO[],
  flatTree: [] as string[],
  currentWorkspace: NULL_WORKSPACE as Workspace,
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

const DEFAULT_MIME_TYPE = "application/octet-stream"; //i think this just means binary?

export function useFileContents(listenerCb?: (content: string | null) => void) {
  const listenerCbRef = useRef(listenerCb);
  const { currentWorkspace } = useWorkspaceContext();
  const { path: filePath } = useWorkspaceRoute();
  const [initialContents, setInitialContents] = useState<Uint8Array<ArrayBufferLike> | string | null>(null);
  const [error, setError] = useState<null | Error>(null);
  const router = useRouter();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => clearTimeout(debounceRef.current!);
  }, []);

  const updateContents = (updates: string) => {
    if (filePath && currentWorkspace) {
      void currentWorkspace?.disk.writeFile(filePath, updates);
      //DO NOT EMIT THIS, IT MESSES UP THE EDITOR VIA TEXT-MD-TEXT TOMFOOLERY -> void currentWorkspace.disk.local.emit(DiskEvents.OUTSIDE_WRITE, {
      //   filePaths: [filePath],
      // });
      //USE INSIDE_WRITE INSTEAD SOMEWHERE ELSE
      //THIS HOOK IS INTEDED FOR OUT OF BAND UPDATES
    }
  };

  const debouncedUpdate = (content: string | null) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      if (content !== null) {
        updateContents(String(content));
      }
    }, 250);
  };

  useEffect(() => {
    void (async () => {
      if (currentWorkspace && filePath) {
        try {
          setInitialContents(await currentWorkspace.disk.readFile(filePath));

          setError(null);
        } catch (error) {
          setError(error as Error);
        }
      }
    })();
  }, [currentWorkspace, filePath, router]);

  useEffect(() => {
    //Mount Remote Listener
    if (filePath) {
      return currentWorkspace.disk.remoteUpdateListener(filePath, setInitialContents);
    }
  }, [currentWorkspace.disk, filePath]);

  useEffect(() => {
    //Mount Local Listener
    if (filePath) {
      return currentWorkspace.disk.outsideWriteListener(filePath, setInitialContents);
    }
  }, [currentWorkspace.disk, filePath]);

  useEffect(() => {
    //mount additional listener
    if (listenerCbRef.current && filePath) {
      return currentWorkspace.disk.outsideWriteListener(filePath, listenerCbRef.current);
    }
  }, [currentWorkspace, filePath]);

  // contents will not reflect the latest changes via updateContents, the state must be tracked somewhere else
  // this avoids glitchy behavior in the editor et all
  // the editor should use contents as initialContents
  // the editor will track the contents state itself, writes using debouncedUpdate WILL write to file
  return {
    error,
    filePath,
    initialContents: initialContents !== null ? String(initialContents) : null,
    mimeType: getMimeType(filePath ?? "") ?? DEFAULT_MIME_TYPE,
    updateContents,
    debouncedUpdate,
  };
}
export function useCurrentFilepath() {
  const { currentWorkspace } = useWorkspaceContext();
  const { path: filePath } = useWorkspaceRoute();

  if (filePath === null || currentWorkspace.isNull) {
    return { filePath: null, mimeType: DEFAULT_MIME_TYPE, isImage: null, isMarkdown: null, inTrash: null };
  }
  const mimeType = mime.lookup(filePath) || DEFAULT_MIME_TYPE;

  return {
    filePath,
    mimeType,
    isMarkdown: mimeType.startsWith("text/markdown"),
    isImage: mimeType.startsWith("image/"),
    inTrash: filePath.startsWith(SpecialDirs.Trash),
  };
}

export function useWorkspaceRoute() {
  const pathname = usePathname();
  return (
    useMemo(() => {
      if (!pathname)
        return {
          id: null,
          path: null,
        };
      const { workspaceId, filePath } = Workspace.parseWorkspacePath(pathname);
      if (workspaceId && workspaceId !== "new") {
        return {
          id: workspaceId ?? null,
          path: filePath ?? null,
        };
      }
    }, [pathname]) ?? {
      id: null,
      path: null,
    }
  );
}

export function useWatchWorkspaceFileTree(currentWorkspace: Workspace, filter?: (node: TreeNode) => boolean) {
  const [fileTreeDir, setFileTree] = useState<TreeDirRoot>(NULL_TREE_ROOT);
  const [flatTree, setFlatTree] = useState<string[]>([]);

  useEffect(() => {
    if (currentWorkspace) {
      return currentWorkspace.watchDiskIndex((fileTreeDir: TreeDir) => {
        const newTree = new TreeDirRoot(fileTreeDir);
        //if getFlateTree() === flatTree [they are the same] do not update
        setFileTree(newTree);
        setFlatTree(currentWorkspace.getFlatTree(filter));
      });
    }
  }, [currentWorkspace, filter]);
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
