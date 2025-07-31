"use client";
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
    //todo hackish
    if (workspaceId === "new" || !workspaceId) {
      setCurrentWorkspace(NULL_WORKSPACE);
      return;
    }
    const workspace = WorkspaceDAO.FetchModelFromNameAndInit(workspaceId)
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
  }, [router, workspaceId]);

  useEffect(() => {
    if (!currentWorkspace) return;
    const listeners = [
      currentWorkspace.renameListener((CHANGES) => {
        for (const { oldPath, newPath, fileType } of CHANGES) {
          if (
            (fileType === "file" && pathname === currentWorkspace.resolveFileUrl(oldPath)) ||
            (fileType === "dir" && isAncestor({ child: workspaceRoute.path, parent: oldPath }))
          ) {
            if (newPath.startsWith(SpecialDirs.Trash)) {
              router.push(currentWorkspace.replaceUrlPath(pathname, oldPath, newPath));
              void currentWorkspace.tryFirstFileUrl().then((firstFileUrl) => {
                router.push(firstFileUrl);
              });
            } else {
              router.push(currentWorkspace.replaceUrlPath(pathname, oldPath, newPath));
            }
          }
        }
      }),
      currentWorkspace.createListener(async (details) => {
        if (workspaceRoute.path === null) {
          const navPath = details.filePaths
            .map((path) => currentWorkspace.nodeFromPath(path))
            .find((n) => n?.isTreeFile())?.path;
          if (navPath) router.push(currentWorkspace.resolveFileUrl(navPath));
        }
      }),
      currentWorkspace.deleteListener(async (details) => {
        if (
          workspaceRoute.path &&
          details.filePaths.some((path) => isAncestor({ child: workspaceRoute.path, parent: path }))
        ) {
          router.push(await currentWorkspace.tryFirstFileUrl());
        }
      }),
    ];
    return () => {
      listeners.forEach((listener) => listener());
    };
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
