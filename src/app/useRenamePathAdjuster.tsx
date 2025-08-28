import { Workspace } from "@/Db/Workspace";
import { AbsPath } from "@/lib/paths2";
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

export function useRenamePathAdjuster({
  path,
  currentWorkspace,
}: {
  path: AbsPath | null;
  currentWorkspace: Workspace;
}) {
  const router = useRouter();

  useEffect(() => {
    if (path && currentWorkspace && !currentWorkspace.isNull) {
      return currentWorkspace.renameListener((details) => {
        const pathRename = details.find(({ oldPath }) => oldPath === path);
        if (pathRename) {
          router.history.replace(
            window.location.pathname.replace(pathRename.oldPath, pathRename.newPath) + window.location.search
          );
        }
      });
    }
  }, [currentWorkspace, path, router]);
}
