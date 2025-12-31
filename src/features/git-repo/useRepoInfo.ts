import { GitRepo, RepoDefaultInfo } from "@/features/git-repo/GitRepo";
import { emitter } from "@/lib/Observable";
import { useSyncExternalStore } from "react";

export function useRepoInfo(repo: GitRepo) {
  const info = useSyncExternalStore(
    (callback) => emitter(repo.infoState).on('info', callback),
    () => repo.infoState.info
  );
  return info ?? RepoDefaultInfo;
}
