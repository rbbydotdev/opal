import { Workspace } from "@/Db/Workspace";
import {
  GitPlaybook,
  GitRemotePlaybook,
  NullGitPlaybook,
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
import { UnsubscribeFunction } from "emittery";
import { useEffect, useMemo, useRef, useState } from "react";

export function useGitPlaybook(repo: Repo | Comlink.Remote<Repo>): GitPlaybook | GitRemotePlaybook {
  return useMemo(() => {
    if (repo instanceof RepoWithRemote) {
      return new GitRemotePlaybook(repo);
    }

    return new GitPlaybook(repo);
  }, [repo]);
}

export function useWorkspaceRepoWW(workspace: Workspace, onPathNoExists?: (path: string) => void) {
  const _onPathNoExistsRef = useRef(onPathNoExists);
  const repoRef = useRef<Comlink.Remote<Repo> | Repo>(new NullRepo());
  const [info, setInfo] = useState<RepoInfoType>(RepoDefaultInfo);
  const [playbook, setPlaybook] = useState<GitPlaybook>(new NullGitPlaybook());
  useEffect(() => {
    const unsubs: UnsubscribeFunction[] = [];
    let worker: Worker | null = null;
    void (async () => {
      worker = new Worker(new URL("@/workers/RepoWorker/repo.ww.ts", import.meta.url));
      const RepoApi = Comlink.wrap<typeof Repo>(worker);
      const repoInstance = await new RepoApi({
        guid: `${workspace.id}/repo`,
        disk: workspace.disk.toJSON(),
      });

      await repoInstance.init();
      unsubs.push(
        ...(await Promise.all([
          workspace.AttachRepo(repoInstance),
          repoInstance.infoListener(async (newInfo) => {
            if (newInfo) setInfo(newInfo);
          }),
        ]))
      );
      await repoInstance.sync();
      repoRef.current = repoInstance;
      setPlaybook(new GitPlaybook(repoInstance));
    })();
    return () => {
      unsubs.forEach((unsub) => unsub());
      worker?.terminate();
      void repoRef.current?.tearDown();
    };
  }, [workspace.disk, workspace.id, repoRef, setPlaybook, setInfo, workspace]);
  return { repo: repoRef.current, info, playbook };
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
