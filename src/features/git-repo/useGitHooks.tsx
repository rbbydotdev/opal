import { CommonFileSystem } from "@/Db/CommonFileSystem";
import { Disk } from "@/Db/Disk";
import { Workspace } from "@/Db/Workspace";
import { GitPlaybook, GitRemotePlaybook, Repo, RepoWithRemote } from "@/features/git-repo/GitRepo";
import { AbsPath, absPath } from "@/lib/paths2";
import { useMemo, useState } from "react";

export function useGitPlaybook(repo: Repo | RepoWithRemote) {
  return useMemo(() => {
    if (repo instanceof RepoWithRemote) {
      return new GitRemotePlaybook(repo);
    }
    return new GitPlaybook(repo);
  }, [repo]);
}

export function useGitPlaybookFromDisk(disk: Disk) {
  return useGitPlaybook(disk.NewGitRepo());
}

export function useUIGitPlaybook(repo: Repo) {
  const playbook = useGitPlaybook(repo);
  const [pendingCommand, setPending] = useState<"commit" | null>(null);
  const commit = async () => {
    const minWait = new Promise((rs) => setTimeout(rs, 1000));
    try {
      setPending("commit");
      await playbook.commit("opal commit");
    } catch (e) {
      console.error("Error in commit function:", e);
    } finally {
      await minWait;
      setPending(null);
    }
  };
  return { isPending: pendingCommand !== null, pendingCommand, commit };
}

export function useWorkspaceRepo(workspace: Workspace) {
  const repo = useMemo(() => workspace.disk.NewGitRepo(), [workspace]);
  return { repo, latestCommit: null };
}
export function useGitRepoFromDisk(disk: Disk): Repo {
  return useMemo(() => disk.NewGitRepo(), [disk]);
}
export function useGitRepo(fs: CommonFileSystem, dir: AbsPath = absPath("/"), branch: string = "main"): Repo {
  return useMemo(() => new Repo({ fs, dir, branch }), [branch, dir, fs]);
}
