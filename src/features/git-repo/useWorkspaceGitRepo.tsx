import { Workspace } from "@/data/Workspace";
import { useRepoInfo } from "@/features/git-repo/useRepoInfo";
export function useWorkspaceGitRepo({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const repo = currentWorkspace.getRepo();
  const playbook = currentWorkspace.getPlaybook();
  const info = useRepoInfo(repo);
  return { repo, playbook, info };
}
