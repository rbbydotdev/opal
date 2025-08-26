import { GitPlaybook } from "@/features/git-repo/GitPlaybook";
import { GitRepo, RepoInfoType } from "@/features/git-repo/GitRepo";
import "@/workers/transferHandlers/disk.th";
import "@/workers/transferHandlers/function.th";
import "@/workers/transferHandlers/repo.th";
import * as Comlink from "comlink";
import { useMemo } from "react";

export function useGitPlaybook(repo: GitRepo | Comlink.Remote<GitRepo>): GitPlaybook {
  return useMemo(() => {
    return new GitPlaybook(repo);
  }, [repo]);
}
export type WorkspaceRepoType = DeepNonNullable<RepoInfoType, "currentBranch" | "currentRef">;
