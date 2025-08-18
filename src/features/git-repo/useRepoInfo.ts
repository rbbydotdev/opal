import { GitRepo, RepoDefaultInfo } from "@/features/git-repo/GitRepo";
import { useSyncExternalStore } from "react";

export function useRepoInfo(repo: GitRepo) {
  return useSyncExternalStore(repo.infoListener, () => repo.getInfo()) ?? RepoDefaultInfo;
}
