import { useWatchViewMode } from "@/components/Editor/view-mode/useWatchViewMode";
import { NullWorkspace } from "@/Db/NullWorkspace";
import { SpecialDirs } from "@/Db/SpecialDirs";
import { Workspace } from "@/Db/Workspace";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { GitPlaybook, NullGitPlaybook, NullRepo } from "@/features/git-repo/GitPlaybook";
import { GitRepo } from "@/features/git-repo/GitRepo";
import { useWorkspaceCorruption } from "@/features/workspace-corruption/useWorkspaceCorruption";
import { WorkspaceCorruptionModal } from "@/features/workspace-corruption/WorkspaceCorruptionModal";
import { useUrlParam } from "@/hooks/useUrlParam";
import { NotFoundError } from "@/lib/errors";
import { useErrorToss } from "@/lib/errorToss";
import { FileTree, NULL_FILE_TREE } from "@/lib/FileTree/Filetree";
import { NULL_TREE_ROOT, TreeDir, TreeDirRoot, TreeNode } from "@/lib/FileTree/TreeNode";
import { getMimeType } from "@/lib/mimeType";
import { AbsPath, isAncestor, isBin, isCss, isEjs, isImage, isMarkdown, isSourceOnly } from "@/lib/paths2";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { decodePath } from "../lib/paths2";

export const NULL_WORKSPACE = new NullWorkspace();

const defaultWorkspaceContext = {
  fileTree: NULL_FILE_TREE as FileTree,
  fileTreeDir: NULL_TREE_ROOT as TreeDir,
  workspaces: [] as WorkspaceDAO[],
  flatTree: [] as AbsPath[],
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

function isRecognizedFileType(mimeType: string): boolean {
  // Images, markdown, text files (including code files), HTML, CSS, EJS templates, and common web formats are recognized
  return (
    mimeType.startsWith("image/") ||
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/javascript" ||
    mimeType === "application/typescript" ||
    mimeType === "application/xml" ||
    mimeType === "text/html" ||
    mimeType === "text/css" ||
    mimeType === "text/x-ejs"
  );
}

export function useCurrentFilepath() {
  const { currentWorkspace } = useWorkspaceContext();
  const { path: filePath } = useWorkspaceRoute();
  const viewMode = useWatchViewMode("hash+search");
  const [editOverride] = useUrlParam({
    key: "editOverride",
    paramType: "hash+search",
    parser: (value) => value === "true",
    serializer: (value) => String(value),
  });

  if (filePath === null || currentWorkspace.isNull) {
    return {
      filePath: null,
      mimeType: DEFAULT_MIME_TYPE,
      isImage: false,
      isMarkdown: false,
      isCssFile: false,
      isEjs: false,
      isSource: false,
      inTrash: false,
    };
  }
  const mimeType = getMimeType(filePath) || DEFAULT_MIME_TYPE;

  return {
    filePath,
    mimeType,

    isMarkdown: isMarkdown(filePath),
    isImage: isImage(filePath),
    isSource: isSourceOnly(filePath),
    isCssFile: isCss(filePath),
    isEjs: isEjs(filePath),
    isBin: isBin(filePath),

    inTrash: filePath.startsWith(SpecialDirs.Trash),
    isRecognized: isRecognizedFileType(mimeType) || editOverride,
    isSourceView: viewMode === "source",
    isRichView: viewMode === "rich-text",
    isDiffView: viewMode === "diff",
    viewMode: viewMode,
    hasEditOverride: editOverride,
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
export function useWatchWorkspaceFileTree({
  currentWorkspace,
  filterIn,
  filterOut,
}: {
  currentWorkspace: Workspace;
  filterIn?: FileOnlyFilter | DirOnlyFilter | ((node: TreeNode) => boolean);
  filterOut?: FileOnlyFilter | DirOnlyFilter | ((node: TreeNode) => boolean);
}) {
  const [fileTreeDir, setFileTreeDir] = useState<TreeDirRoot>(() => currentWorkspace.getFileTreeRoot());
  const [flatTree, setFlatTree] = useState<AbsPath[]>([]);
  const [fileTree, setFileTree] = useState(() => currentWorkspace.getFileTree());

  useEffect(() => {
    if (currentWorkspace) {
      return currentWorkspace.watchDiskIndex((fileTreeDir: TreeDir) => {
        const newTree = new TreeDirRoot(fileTreeDir.deepCopy() as TreeDir).pruneMutate((treeNode) => {
          if (filterIn && !filterIn(treeNode)) return true; // filterIn
          if (filterOut && filterOut(treeNode)) return true; // filterOut
          return false;
        });
        setFileTreeDir(newTree);
        setFlatTree(currentWorkspace.getFlatTree({ filterIn, filterOut }));
        setFileTree(currentWorkspace.getFileTree());
      });
    }
  }, [currentWorkspace, filterIn, filterOut]);

  return { fileTreeDir, fileTree, flatTree };
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

export const WorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const workspaces = useLiveWorkspaces();
  const workspaceRoute = useWorkspaceRoute();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(NULL_WORKSPACE);
  const { fileTreeDir, flatTree, fileTree } = useWatchWorkspaceFileTree({ currentWorkspace });
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceName } = Workspace.parseWorkspacePath(location.pathname);
  const tossError = useErrorToss();

  // Use workspace corruption handling feature
  const { errorState, handleWorkspaceError, clearError, shouldPreventInitialization } = useWorkspaceCorruption();

  useEffect(() => {
    if (workspaceName === "new" || !workspaceName) {
      setCurrentWorkspace(NULL_WORKSPACE);
      clearError(); // Clear any previous errors
      return;
    }

    // Prevent duplicate error handling for the same workspace
    if (shouldPreventInitialization(workspaceName)) {
      return;
    }

    const workspace = WorkspaceDAO.FetchModelFromNameAndInit(workspaceName)
      .then((ws) => {
        setCurrentWorkspace(ws);
        clearError(); // Clear errors on successful load
        console.debug("Initialize Workspace:" + ws.name);
        return ws;
      })
      .catch(async (error: Error) => {
        if (error instanceof NotFoundError) {
          tossError(new NotFoundError(`The workspace "${workspaceName}" does not exist.`));
          // void navigate({ to: "/" });
          return;
        }
        console.error("Failed to initialize workspace:", error);
        // Handle the error using the feature module
        await handleWorkspaceError(workspaceName, error);
        // Set workspace to null and tear down on fatal error
        setCurrentWorkspace(NULL_WORKSPACE);
      });

    return () => {
      void workspace.then((ws) => ws?.tearDown());
    };
  }, [navigate, workspaceName, shouldPreventInitialization, handleWorkspaceError, clearError, tossError]);

  useEffect(() => {
    if (!currentWorkspace) return;
    const listeners = [
      currentWorkspace.renameListener((CHANGES) => {
        for (const { oldPath, newPath, fileType } of CHANGES) {
          if (
            (fileType === "file" &&
              decodePath(location.pathname) === decodePath(currentWorkspace.resolveFileUrl(oldPath))) ||
            (fileType === "dir" && isAncestor({ child: workspaceRoute.path, parent: oldPath }))
          ) {
            if (newPath.startsWith(SpecialDirs.Trash)) {
              void navigate({ to: currentWorkspace.replaceUrlPath(location.pathname, oldPath, newPath) });
              void currentWorkspace.tryFirstFileUrl().then((firstFileUrl) => {
                void navigate({ to: firstFileUrl });
              });
            } else {
              void navigate({ to: currentWorkspace.replaceUrlPath(location.pathname, oldPath, newPath) });
            }
          }
        }
      }),
      currentWorkspace.createListener(async (details) => {
        if (workspaceRoute.path === null) {
          const navPath = details.filePaths
            .map((path) => currentWorkspace.nodeFromPath(path))
            .find((n) => n?.isTreeFile())?.path;
          if (navPath) void navigate({ to: currentWorkspace.resolveFileUrl(navPath) });
        }
      }),
      currentWorkspace.renameWorkspaceListener((payload) =>
        navigate({ to: "/workspace/$workspaceName/$", params: { workspaceName: payload.newName } })
      ),
      currentWorkspace.deleteWorkspaceListener(() => navigate({ to: "/" })),
      currentWorkspace.deleteListener(async (details) => {
        if (
          workspaceRoute.path &&
          details.filePaths.some((path) => isAncestor({ child: workspaceRoute.path, parent: path }))
        ) {
          void navigate({ to: await currentWorkspace.tryFirstFileUrl() });
        }
      }),
    ];
    return () => {
      listeners.forEach((listener) => listener());
    };
  }, [currentWorkspace, location.pathname, navigate, workspaceRoute.path]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        workspaceRoute,
        flatTree,
        fileTree,
        fileTreeDir,
        git: {
          repo: currentWorkspace.getRepo(),
          playbook: currentWorkspace.getPlaybook(),
        },
      }}
    >
      {children}

      {/* Workspace Corruption Modal */}
      <WorkspaceCorruptionModal errorState={errorState} />
    </WorkspaceContext.Provider>
  );
};
