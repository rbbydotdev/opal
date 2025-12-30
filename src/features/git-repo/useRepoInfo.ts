import { GitRepo, RepoDefaultInfo } from "@/features/git-repo/GitRepo";
import { useSnapshot } from "valtio";

export function useRepoInfo(repo: GitRepo) {
  // Use snapshot to trigger re-renders
  useSnapshot(repo.infoState);
  return repo.infoState.info ?? RepoDefaultInfo;
}
