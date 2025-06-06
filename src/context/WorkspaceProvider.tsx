"use client";
import {
  NULL_WORKSPACE,
  useLiveWorkspaces,
  useWatchWorkspaceFileTree,
  useWorkspaceRoute,
  WorkspaceContext,
} from "@/context/WorkspaceHooks";
import { Workspace, WorkspaceDAO } from "@/Db/Workspace";
import { isAncestor } from "@/lib/paths2";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export const WorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const workspaces = useLiveWorkspaces();
  const workspaceRoute = useWorkspaceRoute();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(NULL_WORKSPACE);
  // do i need this still? if (currentWorkspace?.href && !pathname.startsWith(currentWorkspace?.href)) return new NullWorkspace();
  const { fileTreeDir, isIndexed, firstFile, flatTree } = useWatchWorkspaceFileTree(currentWorkspace);
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
        router.replace("/new"); //attempt recovery
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
        //redirect to the new path
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
