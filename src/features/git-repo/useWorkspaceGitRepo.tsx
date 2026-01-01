import { GitRepo } from "@/features/git-repo/GitRepo";
import { useRepoInfo } from "@/features/git-repo/useRepoInfo";
import { emitter } from "@/lib/Observable";
import { Workspace } from "@/workspace/Workspace";
import { useSyncExternalStore } from "react";

const useGlobalPending = (repo: GitRepo) =>
  useSyncExternalStore(
    (callback) => emitter(repo.$state).on("isPending", callback),
    () => repo.$state.isPending
  );

export function useWorkspaceGitRepo({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const repo = currentWorkspace.repo;
  const playbook = currentWorkspace.playbook;
  const globalPending = useGlobalPending(repo);
  const info = useRepoInfo(repo);
  return { repo, playbook, info, globalPending };
}
