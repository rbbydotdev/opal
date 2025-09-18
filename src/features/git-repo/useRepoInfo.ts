import { GitRepo, RepoDefaultInfo } from "@/features/git-repo/GitRepo";
import { useMemo, useSyncExternalStore } from "react";

export function useRepoInfo(repo: GitRepo) {
  const getInfo = useMemo(() => () => repo.getInfo(), [repo]);
  return useSyncExternalStore(repo.infoListener, getInfo) ?? RepoDefaultInfo;
}
