import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { useRepoInfo } from "@/features/git-repo/useRepoInfo";

export function useWorkspaceGitRepo() {
  //chill facade for now
  const { repo, playbook } = useWorkspaceContext().git;
  const info = useRepoInfo(repo);
  return { repo, playbook, info };
}
