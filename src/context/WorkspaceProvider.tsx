"use client";
import {
  NULL_WORKSPACE,
  useLiveWorkspaces,
  useWatchWorkspaceFileTree,
  useWorkspaceRoute,
  WorkspaceContext,
} from "@/context/WorkspaceHooks";
import { Workspace } from "@/Db/Workspace";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { isAncestor } from "@/lib/paths2";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export const WorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const workspaces = useLiveWorkspaces();
  const workspaceRoute = useWorkspaceRoute();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(NULL_WORKSPACE);
  const { fileTreeDir, flatTree } = useWatchWorkspaceFileTree(currentWorkspace);
  const pathname = usePathname();
  const router = useRouter();
  const { workspaceId } = Workspace.parseWorkspacePath(pathname);

  useEffect(() => {
    if (workspaceId === "new" || !workspaceId) {
      setCurrentWorkspace(NULL_WORKSPACE);
      return;
    }
    const workspace = WorkspaceDAO.fetchFromNameAndInit(workspaceId)
      .then((ws) => {
        setCurrentWorkspace(ws);
        console.debug("Initialize Workspace:" + ws.name);
        return ws;
      })
      .catch((e) => {
        router.replace("/new");
        throw e;
      });
    return () => {
      void workspace.then((ws) => ws.tearDown());
    };
  }, [router, workspaceId]);

  useEffect(() => {
    if (!currentWorkspace) return;
    currentWorkspace.renameListener(({ oldPath, newPath, fileType }) => {
      if (
        (fileType === "file" && pathname === currentWorkspace.resolveFileUrl(oldPath)) ||
        (fileType === "dir" && isAncestor(workspaceRoute.path, oldPath))
      ) {
        console.debug("Redirecting to new file:", newPath);
        router.push(currentWorkspace.replaceUrlPath(pathname, oldPath, newPath));
      }
    });
    currentWorkspace.deleteListener(async (details) => {
      if (workspaceRoute.path && details.filePaths.some((path) => isAncestor(workspaceRoute.path, path))) {
        router.push(await currentWorkspace.tryFirstFileUrl());
      }
    });
  }, [currentWorkspace, pathname, router, workspaceRoute.path]);

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
