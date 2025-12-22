import { FileTree, NULL_FILE_TREE } from "@/components/filetree/Filetree";
import { NULL_TREE_ROOT, TreeDir, TreeDirRoot, TreeNode } from "@/components/filetree/TreeNode";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WorkspaceDAO } from "@/data/dao/WorkspaceDAO";
import { Disk } from "@/data/disk/Disk";
import { SpecialDirs } from "@/data/SpecialDirs";
import { useWatchViewMode } from "@/editors/view-mode/useWatchViewMode";
import { GitPlaybook, NullGitPlaybook, NullRepo } from "@/features/git-repo/GitPlaybook";
import { GitRepo } from "@/features/git-repo/GitRepo";
import { useWorkspaceCorruption } from "@/features/workspace-corruption/useWorkspaceCorruption";
import { WorkspaceCorruptionModal } from "@/features/workspace-corruption/WorkspaceCorruptionModal";
import { NotFoundError } from "@/lib/errors/errors";
import { useErrorToss } from "@/lib/errors/errorToss";
import { OpalMimeType } from "@/lib/fileType";
import { getMimeType } from "@/lib/mimeType";
import {
  AbsPath,
  isAncestor,
  isBin,
  isCss,
  isEjs,
  isHtml,
  isImage,
  isMarkdown,
  isSourceOnly,
  resolveFromRoot,
} from "@/lib/paths2";
import { isSourceMimeType } from "@/source-editor/SourceMimeType";
import { NullWorkspace } from "@/workspace/NullWorkspace";
import { useWorkspaces } from "@/workspace/useWorkspaces";
import { Workspace } from "@/workspace/Workspace";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { useQueryState } from "nuqs";
import React, { useContext, useEffect, useMemo, useState } from "react";

const NULL_WORKSPACE = new NullWorkspace();

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
  workspaceRoute: { name: null, path: null } as WorkspaceRouteType,
};
type WorkspaceContextType = typeof defaultWorkspaceContext;

const WorkspaceContext = React.createContext<WorkspaceContextType>(defaultWorkspaceContext);

export type WorkspaceRouteType = { name: string | null; path: AbsPath | null };
export const DEFAULT_MIME_TYPE: OpalMimeType = "application/octet-stream"; //i think this just means binary?

function isRecognizedFileType(mimeType: string): boolean {
  // Images, markdown, text files (including code files), HTML, CSS, EJS templates, and common web formats are recognized
  return mimeType.startsWith("image/") || mimeType.startsWith("text/") || isSourceMimeType(mimeType);
}

export function useCurrentFilepath() {
  const { currentWorkspace } = useWorkspaceContext();
  const { path: filePath } = useWorkspaceRoute();
  const [viewMode] = useWatchViewMode();
  const [editOverride] = useQueryState("editOverride", {
    parse: (value: string) => value === "true",
    serialize: (value: boolean) => String(value),
  });

  if (filePath === null || currentWorkspace.isNull) {
    return {
      filePath: null,
      mimeType: DEFAULT_MIME_TYPE,
      isImage: false,
      isHtml: false,
      isBuildPath: false,
      isMarkdown: false,
      isCssFile: false,
      isEjs: false,
      isSource: false,
      inTrash: false,
      isBin: false,
      isRecognized: false,
      isSourceView: false,
      isRichView: false,
      isDiffView: false,
      viewMode: null,
      buildId: null,
      hasEditOverride: false,
    };
  }
  const mimeType = getMimeType(filePath) || DEFAULT_MIME_TYPE;

  const isBuildPath = filePath.startsWith(SpecialDirs.Build);
  return {
    filePath,
    mimeType,

    isHtml: isHtml(filePath),
    isMarkdown: isMarkdown(filePath),
    isImage: isImage(filePath),
    isSource: isSourceOnly(filePath),
    isCssFile: isCss(filePath),
    isEjs: isEjs(filePath),
    isBin: isBin(filePath),

    isBuildPath,
    buildId: isBuildPath ? resolveFromRoot(SpecialDirs.Build, filePath).split("/")[0] : null,

    inTrash: filePath.startsWith(SpecialDirs.Trash),
    isRecognized: isRecognizedFileType(mimeType) || editOverride || false,
    isSourceView: (viewMode === "source") as boolean,
    isRichView: (viewMode === "rich-text") as boolean,
    isDiffView: (viewMode === "diff") as boolean,
    viewMode: viewMode,
    hasEditOverride: editOverride || false,
  };
}

export function useWorkspaceRoute() {
  const location = useLocation();
  return (
    useMemo(() => {
      if (!location.pathname)
        return {
          name: null,
          path: null,
        };
      const { workspaceName, filePath } = Workspace.parseWorkspacePath(location.pathname);
      if (workspaceName && workspaceName !== "new") {
        return {
          name: workspaceName ?? null,
          path: filePath ?? null,
        };
      }
    }, [location.pathname]) ?? {
      name: null,
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
  filterIn,
  disk,
  filterOut,
}: {
  filterIn?: FileOnlyFilter | DirOnlyFilter | ((node: TreeNode) => boolean);
  disk: Disk;
  filterOut?: FileOnlyFilter | DirOnlyFilter | ((node: TreeNode) => boolean);
}) {
  const [fileTreeDir, setFileTreeDir] = useState<TreeDirRoot>(() => disk.fileTree.root);
  const [flatTree, setFlatTree] = useState<AbsPath[]>([]);
  const [fileTree, setFileTree] = useState(() => disk.fileTree);

  useEffect(() => {
    if (!disk.isNull) {
      return disk.latestIndexListener((fileTreeDir: TreeDir) => {
        const newTree = new TreeDirRoot(fileTreeDir.deepCopy() as TreeDir).pruneMutate((treeNode) => {
          if (filterIn && !filterIn(treeNode)) return true; // filterIn
          if (filterOut && filterOut(treeNode)) return true; // filterOut
          return false;
        });
        setFileTreeDir(newTree);
        setFlatTree(disk.getFlatTree({ filterIn, filterOut }));
        setFileTree(disk.fileTree);
      });
    }
  }, [disk, filterIn, filterOut]);

  return { fileTreeDir, fileTree, flatTree };
}

export function useWorkspaceContext() {
  return useContext(WorkspaceContext);
}

export const WorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const workspaces = useWorkspaces();
  const workspaceRoute = useWorkspaceRoute();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(NULL_WORKSPACE);
  const { fileTreeDir, flatTree, fileTree } = useWatchWorkspaceFileTree({ disk: currentWorkspace.disk });
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceName } = Workspace.parseWorkspacePath(location.pathname);
  const tossError = useErrorToss();

  // Use workspace corruption handling feature
  const { errorState, handleWorkspaceError, clearError, shouldPreventInitialization } = useWorkspaceCorruption();

  const [workspaceNotFound, setWorkspaceNotFound] = useState(false);
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

    const workspace = Workspace.FromNameAndInit(workspaceName)
      .then((ws) => {
        setCurrentWorkspace(ws);
        clearError(); // Clear errors on successful load
        console.debug("Initialize Workspace:" + ws.name);
        return ws;
      })
      .catch(async (error: Error) => {
        if (error instanceof NotFoundError) {
          setWorkspaceNotFound(true);
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
            (fileType === "file" && location.pathname === currentWorkspace.resolveFileUrl(oldPath)) ||
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
          repo: currentWorkspace.repo,
          playbook: currentWorkspace.playbook,
        },
      }}
    >
      {children}

      {/* Workspace Corruption Modal */}
      {workspaceNotFound && <WorkspaceNotFound />}
      <WorkspaceCorruptionModal errorState={errorState} />
    </WorkspaceContext.Provider>
  );
};

function WorkspaceNotFound() {
  const [open, setOpen] = useState(true);
  const { name } = useWorkspaceRoute();
  const navigate = useNavigate();
  if (!open) return null;
  return (
    <AlertDialog open={true} onOpenChange={() => {}}>
      <AlertDialogContent className="max-w-md min-w-fit">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive flex justify-start items-center gap-2">
            <TriangleAlert /> Error Workspace Not Found
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-3 text-muted-foreground max-w-md flex items-center gap-2">
            Workspace
            <span className="border p-2 font-mono">{name}</span>
            not found!
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex-col sm:flex-row gap-2">
          <AlertDialogAction
            onClick={() => {
              setOpen(false);
              void navigate({
                to: "/",
              });
            }}
            className="order-2 border border-input hover:bg-accent hover:text-accent-foreground"
          >
            Go Home
          </AlertDialogAction>

          <AlertDialogAction
            onClick={() => {
              setOpen(false);
              void navigate({
                to: "/newWorkspace",
              });
            }}
            className="bg-destructive hover:bg-destructive/90 order-1"
          >
            Create New Workspace
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
