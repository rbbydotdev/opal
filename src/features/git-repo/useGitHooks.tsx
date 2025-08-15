import { Workspace } from "@/Db/Workspace";
import { GitPlaybook, NullGitPlaybook, NullRepo } from "@/features/git-repo/GitPlaybook";
import { Repo, RepoDefaultInfo, RepoInfoType } from "@/features/git-repo/GitRepo";
import { useAsyncEffect } from "@/hooks/useAsyncEffect";
import "@/workers/transferHandlers/disk.th";
import "@/workers/transferHandlers/function.th";
import "@/workers/transferHandlers/repo.th";
import * as Comlink from "comlink";
import { UnsubscribeFunction } from "emittery";
import { useMemo, useRef, useState } from "react";
import { GitRemotePlaybook } from "./GitRemotePlaybook";
import { RepoWithRemote } from "./RepoWithRemote";

export function useGitPlaybook(repo: Repo | Comlink.Remote<Repo>): GitPlaybook | GitRemotePlaybook {
  return useMemo(() => {
    if (repo instanceof RepoWithRemote) {
      return new GitRemotePlaybook(repo);
    }

    return new GitPlaybook(repo);
  }, [repo]);
}

export function useWorkspaceRepo(workspace: Workspace, _onPathNoExists?: (path: string) => void) {
  //this would be suceptible to race conditions git event vs most recent index
  //but i think the events are all when the things end?
  const _onPathNoExistsRef = useRef(_onPathNoExists);
  const repoRef = useRef<Comlink.Remote<Repo> | Repo>(new NullRepo());
  const [info, setInfo] = useState<RepoInfoType>(RepoDefaultInfo);
  const [playbook, setPlaybook] = useState<GitPlaybook>(new NullGitPlaybook());
  useAsyncEffect(async () => {
    const unsubs: UnsubscribeFunction[] = [];
    // const repoWorker = await workspace.RepoWorker();
    // const repoInstance = repoWorker.repo;
    // unsubs.push(() => repoWorker.worker.terminate());
    const repoInstance = workspace.RepoMainThread();
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
    return () => {
      unsubs.forEach((unsub) => unsub());
      void repoRef.current?.tearDown();
    };
  }, [workspace.disk, workspace.id, repoRef, setPlaybook, setInfo, workspace]);
  return { repo: repoRef.current, info, playbook };
}

export type WorkspaceRepoType = DeepNonNullable<RepoInfoType, "currentBranch">;
