import { useWatchViewMode } from "@/components/Editor/view-mode/useWatchViewMode";
import { NullWorkspace } from "@/Db/NullWorkspace";
import { SpecialDirs } from "@/Db/SpecialDirs";
import { Workspace } from "@/Db/Workspace";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { GitPlaybook, NullGitPlaybook, NullRepo } from "@/features/git-repo/GitPlaybook";
import { GitRepo } from "@/features/git-repo/GitRepo";
import { NULL_TREE_ROOT, TreeDir, TreeDirRoot, TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath } from "@/lib/paths2";
import { useLocation } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import mime from "mime-types";
import React, { useContext, useEffect, useMemo, useState } from "react";

export const NULL_WORKSPACE = new NullWorkspace();

const defaultWorkspaceContext = {
  fileTreeDir: NULL_TREE_ROOT,
  workspaces: [] as WorkspaceDAO[],
  flatTree: [] as string[],
  currentWorkspace: NULL_WORKSPACE as Workspace,
  git: {
    repo: new NullRepo() as GitRepo,
    playbook: new NullGitPlaybook() as GitPlaybook,
  },
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

export const DEFAULT_MIME_TYPE = "application/octet-stream"; //i think this just means binary?

export function useCurrentFilepath() {
  const { currentWorkspace } = useWorkspaceContext();
  const { path: filePath } = useWorkspaceRoute();
  const viewMode = useWatchViewMode("hash+search");

  if (filePath === null || currentWorkspace.isNull) {
    return {
      filePath: null,
      mimeType: DEFAULT_MIME_TYPE,
      isImage: null,
      isMarkdown: null,
      inTrash: null,
      isSource: null,
    };
  }
  const mimeType = mime.lookup(filePath) || DEFAULT_MIME_TYPE;

  return {
    filePath,
    mimeType,
    isMarkdown: mimeType.startsWith("text/markdown"),
    isImage: mimeType.startsWith("image/"),
    isSource: !mimeType.startsWith("text/markdown") && mimeType.startsWith("text/"),
    isBin: mimeType.startsWith("application/octet-stream"),
    inTrash: filePath.startsWith(SpecialDirs.Trash),
    isSourceView: viewMode === "source",
    isRichView: viewMode === "rich-text",
    isDiffView: viewMode === "diff",
    viewMode: viewMode,
  };
}

export function useWorkspaceRoute() {
  const location = useLocation();
  return (
    useMemo(() => {
      if (!location.pathname)
        return {
          id: null,
          path: null,
        };
      const { workspaceName, filePath } = Workspace.parseWorkspacePath(location.pathname);
      if (workspaceName && workspaceName !== "new") {
        return {
          id: workspaceName ?? null,
          path: filePath ?? null,
        };
      }
    }, [location.pathname]) ?? {
      id: null,
      path: null,
    }
  );
}

// Branded type for file/dir filters
type FileOnlyFilter = ((node: TreeNode) => boolean) & { __brand: "FileOnlyFilter" };
type DirOnlyFilter = ((node: TreeNode) => boolean) & { __brand: "DirOnlyFilter" };

export const FileOnlyFilter: FileOnlyFilter = Object.assign((node: TreeNode) => node.isTreeFile(), {
  __brand: "FileOnlyFilter" as const,
});

export const DirOnlyFilter: DirOnlyFilter = Object.assign((node: TreeNode) => node.isTreeDir(), {
  __brand: "DirOnlyFilter" as const,
});
export function useWatchWorkspaceFileTree(currentWorkspace: Workspace, filter?: FileOnlyFilter | DirOnlyFilter) {
  const [fileTreeDir, setFileTree] = useState<TreeDirRoot>(NULL_TREE_ROOT);
  const [flatTree, setFlatTree] = useState<AbsPath[]>([]);

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
