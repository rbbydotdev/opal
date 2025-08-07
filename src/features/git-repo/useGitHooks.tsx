import { Workspace } from "@/Db/Workspace";
import {
  GitPlaybook,
  GitRemotePlaybook,
  NullRepo,
  Repo,
  RepoDefaultInfo,
  RepoInfoType,
  RepoWithRemote,
} from "@/features/git-repo/GitRepo";
import "@/workers/transferHandlers/disk.th";
import "@/workers/transferHandlers/function.th";
import "@/workers/transferHandlers/repo.th";
import * as Comlink from "comlink";
import { useEffect, useMemo, useRef, useState } from "react";

export function useGitPlaybook(repo: Repo | Comlink.Remote<Repo>): GitPlaybook | GitRemotePlaybook {
  return useMemo(() => {
    if (repo instanceof RepoWithRemote) {
      return new GitRemotePlaybook(repo);
    }

    return new GitPlaybook(repo);
  }, [repo]);
}

export function useUIGitPlaybook(repo: Repo | Comlink.Remote<Repo>) {
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

// async function repoWebWorker(workspace: Workspace) {
//   const worker = new Worker(new URL("@/workers/RepoWorker/repo.ww.ts", import.meta.url));
//   const RepoApi = Comlink.wrap<typeof Repo>(worker);
//   // debugger;
//   const repoWw = await new RepoApi({
//     guid: `${workspace.id}/repo`,
//     disk: workspace.disk.toJSON(),
//   });

//   await repoWw.init();
//   await repoWw.infoListener((info) => {
//     console.log(">>>>>>>Repo info updated:", info);
//   });
//   console.log(await repoWw.sync());
//   console.log(repoWw.infoListener(() => {}));
// }

export function useWorkspaceRepoWW(workspace: Workspace, onPathNoExists?: (path: string) => void) {
  const _onPathNoExistsRef = useRef(onPathNoExists);
  const repoRef = useRef<Comlink.Remote<Repo> | Repo>(new NullRepo());
  const [info, setInfo] = useState<RepoInfoType>(RepoDefaultInfo);
  const [playbook, setPlaybook] = useState<GitPlaybook>(null);
  useEffect(() => {
    void (async () => {
      const worker = new Worker(new URL("@/workers/RepoWorker/repo.ww.ts", import.meta.url));
      const RepoApi = Comlink.wrap<typeof Repo>(worker);
      const repoInstance = await new RepoApi({
        guid: `${workspace.id}/repo`,
        disk: workspace.disk.toJSON(),
      });
      await repoInstance.infoListener(async (info) => {
        // setInfo(await repoInstance.sync());
        setInfo(info);
      });
      await repoInstance.init();
      repoRef.current = repoInstance;
      setPlaybook(new GitPlaybook(repoInstance));
    })();
  }, [workspace.disk, workspace.id, repoRef, setPlaybook, setInfo]);
  return { repo: repoRef.current, info, playbook, exists: info.initialized };
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
      void (async () => {
        // await workspace.NewRepoWW();
      })();
      return () => repo.tearDown();
    }
  }, [repo, workspace]);

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
