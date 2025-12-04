import { useRepoInfo } from "@/features/git-repo/useRepoInfo";
import { Workspace } from "@/workspace/Workspace";
export function useWorkspaceGitRepo({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const repo = currentWorkspace.getRepo();
  const playbook = currentWorkspace.getPlaybook();
  const info = useRepoInfo(repo);
  return { repo, playbook, info };
}
