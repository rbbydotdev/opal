import { Workspace } from "@/Db/Workspace";
import {
  GitPlaybook,
  GitRemotePlaybook,
  Repo,
  RepoDefaultInfo,
  RepoInfoType,
  RepoWithRemote,
} from "@/features/git-repo/GitRepo";
import { useEffect, useMemo, useState } from "react";

export function useGitPlaybook(repo: Repo | RepoWithRemote) {
  return useMemo(() => {
    if (repo instanceof RepoWithRemote) {
      return new GitRemotePlaybook(repo);
    }
    return new GitPlaybook(repo);
  }, [repo]);
}

export function useUIGitPlaybook(repo: Repo | RepoWithRemote) {
  const playbook = useGitPlaybook(repo);
  const [pendingCommand, setPending] = useState<"commit" | null>(null);
  const commit = async () => {
    const minWait = new Promise((rs) => setTimeout(rs, 1000));
    try {
      setPending("commit");
      await playbook.commit({ message: "opal commit" });
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
  const repo = useMemo(() => workspace.NewRepo(), [workspace]);

  const [info, setInfo] = useState<RepoInfoType>(RepoDefaultInfo);

  useEffect(() => repo.infoListener(setInfo), [repo]);

  useEffect(() => {
    if (repo) {
      void repo.init();
      return () => repo.tearDown();
    }
  }, [repo]);

  if (!info.latestCommit) {
    return { repo, info: null, exists: false } satisfies {
      repo: Repo;
      info: null;
      exists: false;
    };
  } else {
    return { repo, info, exists: true } as {
      repo: Repo;
      info: DeepNonNullable<RepoInfoType>; //typeof info & { latestCommit: RepoLatestCommit };
      exists: true;
    };
  }
}
// export function useGitRepoFromDisk(disk: Disk): Repo {
//   return useMemo(() => disk.NewGitRepo(), [disk]);
// }
// export function useGitRepo(fs: CommonFileSystem, dir: AbsPath = absPath("/"), branch: string = "main"): Repo {
//   return useMemo(() => new Repo({ fs, dir, defaultBranch: branch }), [branch, dir, fs]);
// }
