import { Workspace } from "@/Db/Workspace";
import {
  GitPlaybook,
  GitRemotePlaybook,
  Repo,
  RepoDefaultInfo,
  RepoInfoType,
  RepoWithRemote,
} from "@/features/git-repo/GitRepo";
import { useEffect, useMemo, useRef, useState } from "react";

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
      await playbook.addAllCommit({ message: "opal user commit" });
    } catch (e) {
      console.error("Error in commit function:", e);
    } finally {
      await minWait;
      setPending(null);
    }
  };
  return { isPending: pendingCommand !== null, pendingCommand, commit };
}

export function useWorkspaceRepo(workspace: Workspace, onPathNoExists?: (path: string) => void) {
  const onPathNoExistsRef = useRef(onPathNoExists);
  const repo = useMemo(() => workspace.NewRepo(onPathNoExistsRef.current), [workspace]);
  const playbook = useGitPlaybook(repo);

  const [info, setInfo] = useState<RepoInfoType>(RepoDefaultInfo);

  useEffect(() => repo.infoListener(setInfo), [repo]);

  useEffect(() => {
    if (repo) {
      void repo.init();
      return () => repo.tearDown();
    }
  }, [repo]);

  if (!info.latestCommit) {
    return { repo, playbook, info: null, exists: false } satisfies {
      repo: Repo;
      playbook: GitPlaybook;
      info: null;
      exists: false;
    };
  } else {
    return { repo, info, playbook, exists: true } as {
      repo: Repo;
      playbook: GitPlaybook;
      info: DeepNonNullable<RepoInfoType, "currentBranch">; //typeof info & { latestCommit: RepoLatestCommit };
      exists: true;
    };
  }
}
export type WorkspaceRepoType = DeepNonNullable<RepoInfoType, "currentBranch">;
// export function useGitRepoFromDisk(disk: Disk): Repo {
//   return useMemo(() => disk.NewGitRepo(), [disk]);
// }
// export function useGitRepo(fs: CommonFileSystem, dir: AbsPath = absPath("/"), branch: string = "main"): Repo {
//   return useMemo(() => new Repo({ fs, dir, defaultBranch: branch }), [branch, dir, fs]);
// }
