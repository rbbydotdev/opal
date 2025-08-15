import {
  NULL_WORKSPACE,
  useLiveWorkspaces,
  useWatchWorkspaceFileTree,
  useWorkspaceRoute,
  WorkspaceContext,
} from "@/context/WorkspaceHooks";
import { SpecialDirs } from "@/Db/SpecialDirs";
import { Workspace } from "@/Db/Workspace";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { isAncestor } from "@/lib/paths2";
import { useLocation, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";

export const WorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const workspaces = useLiveWorkspaces();
  const workspaceRoute = useWorkspaceRoute();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(NULL_WORKSPACE);
  const { fileTreeDir, flatTree } = useWatchWorkspaceFileTree(currentWorkspace);
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceName } = Workspace.parseWorkspacePath(location.pathname);

  useEffect(() => {
    //todo hackish
    if (workspaceName === "new" || !workspaceName) {
      setCurrentWorkspace(NULL_WORKSPACE);
      return;
    }
    const workspace = WorkspaceDAO.FetchModelFromNameAndInit(workspaceName)
      .then((ws) => {
        setCurrentWorkspace(ws);
        console.debug("Initialize Workspace:" + ws.name);
        return ws;
      })
      .catch(() => {
        // router.replace("/newWorkspace");
        // router.replace("/newWorkspace");
        window.location.href = "/";
        // toss(e);
        // notFound();
        // throw e;
        // return NULL_WORKSPACE;
      });
    return () => {
      void workspace.then((ws) => ws?.tearDown());
    };
  }, [navigate, workspaceName]);

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
              navigate({ to: currentWorkspace.replaceUrlPath(location.pathname, oldPath, newPath) });
              void currentWorkspace.tryFirstFileUrl().then((firstFileUrl) => {
                navigate({ to: firstFileUrl });
              });
            } else {
              navigate({ to: currentWorkspace.replaceUrlPath(location.pathname, oldPath, newPath) });
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
        fileTreeDir,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};
