import {
  Download,
  GitBranchIcon,
  GitMerge,
  GitPullRequestDraftIcon,
  Import,
  Loader,
  PlusIcon,
  RefreshCw,
  Upload,
} from "lucide-react";
import React, { useState } from "react";

import { SidebarGripChevron } from "@/components/SidebarFileMenu/publish-section/SidebarGripChevron";
import { RefsManagerSection } from "@/components/SidebarFileMenu/sync-section/GitBranchManager";
import { GitRemoteDialog, useGitRemoteDialogCmd } from "@/components/SidebarFileMenu/sync-section/GitRemoteDialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton } from "@/components/ui/sidebar";
import { useTooltipToastCmd } from "@/components/ui/TooltipToast";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { WorkspaceRepoType } from "@/features/git-repo/useGitHooks";
import { useRepoInfo } from "@/features/git-repo/useRepoInfo";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { useTimeAgoUpdater } from "@/hooks/useTimeAgoUpdater";
import { NotFoundError } from "@/lib/errors";
import { useErrorToss } from "@/lib/errorToss";
import { CommitManagerSection } from "./CommitManagerSection";
import { RemoteManagerSection } from "./GitRemoteManager";

function InfoCollapsible({ info }: { info: WorkspaceRepoType }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible className="w-full" open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button className="w-full" size="sm" variant="outline">
          {open ? "Hide Info" : "Show Info"}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="w-full mt-2">
        <LatestInfo info={info} />
      </CollapsibleContent>
    </Collapsible>
  );
}
function LatestInfo({ info }: { info: WorkspaceRepoType }) {
  const { latestCommit, context, isMerging, currentBranch, hasChanges } = info;
  const timeAgo = useTimeAgoUpdater({ date: new Date(latestCommit.date) });
  if (!latestCommit) {
    return null;
  }
  return (
    <dl className="mb-4 grid [grid-template-columns:max-content_1fr] gap-x-2 font-mono text-2xs text-left">
      <dt className="font-bold">commit:</dt>
      <dd className="truncate">{latestCommit.oid}</dd>
      <dt className="font-bold">branch:</dt>
      <dd className="truncate">{currentBranch || <i>none / detached</i>}</dd>
      <dt className="font-bold">has changes:</dt>
      <dd className="truncate">{hasChanges ? <b className="font-bold">yes</b> : "no"}</dd>
      <dt className="font-bold">date:</dt>
      <dd className="truncate">{new Date(latestCommit.date).toLocaleString()}</dd>
      <dt className="font-bold">time ago:</dt>
      <dd className="truncate">{timeAgo}</dd>
      <dt className="font-bold">context:</dt>
      <dd className="truncate">{context}</dd>
      {isMerging && (
        <>
          <dt className="font-bold">merging:</dt>
          <dd className="truncate">
            <b>true</b>
          </dd>
        </>
      )}
    </dl>
  );
}

type CommitState =
  | "init"
  | "bare-init"
  | "commit"
  | "merge-commit"
  | "commit-disabled"
  | "enter-message"
  | "pending"
  | "detatched";

function CommitSection({
  commitState,
  commit,
  initialCommit,
  initialRepo,
  commitRef,
  mergeCommit,
  setShowMessageInput,
  setPending,
}: {
  commitState: CommitState;
  commit: (message: string) => void;
  mergeCommit: () => void;
  initialCommit: () => void;
  initialRepo: () => void;
  commitRef: React.RefObject<{
    show: (text?: string) => void;
  }>;
  setShowMessageInput: (show: boolean) => void;
  setPending: (pending: boolean) => void;
}) {
  const [commitMessage, setCommitMessage] = useState("");

  const handleCommit = async (message: string) => {
    setPending(true);
    setShowMessageInput(false);
    setCommitMessage("");
    await commit(message);
    setPending(false);
    commitRef.current?.show("Committed");
  };
  const handleMergeCommit = async () => {
    setPending(true);
    await mergeCommit();
    setPending(false);
    commitRef.current?.show("Merge Committed");
  };
  const handleInitialCommit = async () => {
    setPending(true);
    await initialCommit();
    setPending(false);
    commitRef.current?.show("Repository initialized");
  };

  const handleButtonClick = () => {
    if (commitState === "merge-commit") return handleMergeCommit();
    if (commitState === "init" || commitState == "bare-init") return handleInitialCommit();
    if (commitState === "commit") return setShowMessageInput(true);
  };

  // const handleRemoteInit = () => {
  //   initialRepo();
  // };

  const handleMessageSubmit = async (message: string) => {
    if (message.trim()) return handleCommit(message);
  };

  const handleMessageCancel = () => {
    setShowMessageInput(false);
    setCommitMessage("");
  };

  if (commitState === "enter-message") {
    return (
      <Input
        placeholder="Enter commit message"
        className="text-xs"
        value={commitMessage}
        onChange={(e) => setCommitMessage(e.target.value)}
        onBlur={handleMessageCancel}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            handleMessageCancel();
          }
          if (e.key === "Enter") {
            e.preventDefault();
            void handleMessageSubmit(commitMessage);
          }
        }}
        autoFocus
      />
    );
  }

  return (
    <>
      <Button
        className="w-full disabled:cursor-pointer h-8"
        onClick={handleButtonClick}
        size="sm"
        variant="outline"
        disabled={commitState === "pending" || commitState === "commit-disabled" || commitState === "detatched"}
      >
        <GitActionButtonLabel commitState={commitState} /*exists={exists}*/ />
      </Button>
    </>
  );
}

const ActionButtonIcons = {
  commit: GitMerge,
  "merge-commit": GitMerge,
  "commit-disabled": GitMerge,
  "enter-message": GitMerge,
  pending: Loader,
  init: PlusIcon,
  "bare-init": PlusIcon,
  detatched: GitPullRequestDraftIcon,
};
const ActionButtonLabels = {
  commit: "Commit",
  "merge-commit": "Merge Commit",
  "commit-disabled": "No Changes to Commit",
  "enter-message": "Enter Commit Message",
  pending: "Committing...",
  init: "Initialize Git Repo",
  "bare-init": "Initial Commit",
  detatched: "Detatched",
};

const GitActionButtonLabel = ({ commitState }: { commitState?: CommitState }) => {
  if (!commitState) return null;
  const Icon = ActionButtonIcons[commitState];
  const labelStr = ActionButtonLabels[commitState];
  if (!Icon || !labelStr) return null;
  return (
    <>
      <Icon className="mr-1" />
      <span className="flex-1 min-w-0 truncate flex justify-center items-center">{labelStr}</span>
    </>
  );
};

function SyncPullPushButtons() {
  return (
    <>
      <div>
        <Button className="w-full" size="sm" variant="outline">
          <RefreshCw className="mr-1" onClick={() => {}} />
          Sync Now
        </Button>
      </div>
      <div>
        <Button className="w-full" size="sm" variant="outline">
          <Download className="mr-1" />
          Pull
        </Button>
      </div>
      <div>
        <Button className="w-full" size="sm" variant="outline">
          <Upload className="mr-1" />
          Push
        </Button>
      </div>
    </>
  );
}

export function SidebarGitSection(props: React.ComponentProps<typeof SidebarGroup>) {
  const { repo, playbook } = useWorkspaceContext().git;
  // const info = useSyncExternalStore(repo.infoListener, () => repo.getInfo()) ?? RepoDefaultInfo;
  const info = useRepoInfo(repo);
  const [expanded, setExpand] = useSingleItemExpander("sync");
  const { cmdRef: commitRef } = useTooltipToastCmd();
  const { cmdRef: remoteRef } = useTooltipToastCmd();
  const { cmdRef: branchRef } = useTooltipToastCmd();
  const { cmdRef: commitManagerRef } = useTooltipToastCmd();
  const tossError = useErrorToss();

  const exists = info.exists;
  const hasChanges = info.hasChanges;
  const isMerging = info.isMerging;
  const currentGitRef = info.currentRef;
  const bareInitialized = info.bareInitialized;
  const fullInitialized = info.fullInitialized;
  const hasRemotes = info.remotes.length > 0;

  // Commit state logic hoisted from CommitSection
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [pending, setPending] = useState(false);
  const [selectRemote, setSelectRemote] = useState<string | null>(null);

  const commitState = ((): CommitState => {
    if (pending) return "pending";
    if (isMerging) return "merge-commit";
    if (showMessageInput) return "enter-message";
    if (bareInitialized && !fullInitialized) return "bare-init";
    if (!exists) return "init";
    if (!hasChanges) return "commit-disabled";
    if (currentGitRef?.type === "commit") return "detatched";
    return "commit";
  })();

  // Remote management functions
  const addRemoteCmdRef = useGitRemoteDialogCmd();
  // const remoteSelectState = useRemoteSelectState(info.remotes);

  const handleFetchRemote = async () => {
    try {
      const remoteName = selectRemote;
      if (!remoteName) return;
      const remote = await repo.getRemote(remoteName);
      if (!remote) {
        throw new NotFoundError("Remote not found");
      }
      const result = await repo.fetch({
        url: remote.url,
        corsProxy: remote.gitCorsProxy,
      });
      console.log("Fetch result:", result);
    } catch (e) {
      tossError(e as Error);
    }
    // repo.info.
    // const currentRemote: GitRemote = {};
    // repo.fetch();
    // console.error('not yet implemented');
  };

  const handleRemoteInit = () => {
    void repo.mustBeInitialized();
    void addRemoteCmdRef.current.open("add").then(async ({ next }) => {
      try {
        if (!next) return;
        await playbook.addRemoteAndFetch(next);
        commitRef.current?.show("Remote added and fetched");
      } catch (err) {
        tossError(err as Error);
      }
    });
  };

  return (
    <SidebarGroup className="pl-0 py-0" {...props}>
      <Collapsible className="group/collapsible flex flex-col min-h-0" open={expanded} onOpenChange={setExpand}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="pl-0">
            <SidebarGroupLabel className="pl-2">
              <SidebarGripChevron />
              <div className="w-full">
                <div className="flex justify-center items-center">
                  <GitBranchIcon size={12} className="mr-2" />
                  Git
                </div>
              </div>
            </SidebarGroupLabel>
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent className="flex flex-col flex-shrink overflow-y-auto">
          <SidebarMenu className="pb-3">
            <div className="px-4 pt-2 gap-4 flex flex-col">
              {exists && <LatestInfo info={info} />}
              {/* {commitState === "init" && (
                <Button
                  className="w-full disabled:cursor-pointer h-8 truncate"
                  onClick={handleRemoteInit}
                  size="sm"
                  variant="outline"
                >
                  <SquareArrowOutUpRightIcon className="mr-1" />
                  <span className="flex-1 min-w-0 truncate">Initialize Git Repo From Remote</span>
                </Button>
              )} */}

              <CommitSection
                commitState={commitState}
                commit={(message) => playbook.addAllCommit({ message })}
                mergeCommit={() => playbook.mergeCommit()}
                initialCommit={() => playbook.initialCommit()}
                initialRepo={() => repo.mustBeInitialized()}
                commitRef={commitRef}
                setShowMessageInput={setShowMessageInput}
                setPending={setPending}
              />
              {(info.fullInitialized || info.bareInitialized) && (
                <RefsManagerSection
                  remoteRefs={info.remoteRefs}
                  info={info}
                  repo={repo}
                  playbook={playbook}
                  currentGitRef={info.currentRef}
                  branches={info.branches}
                  branchRef={branchRef}
                />
              )}
              {info.fullInitialized && info.currentRef && (
                <>
                  <CommitManagerSection
                    refType={info.currentRef.type}
                    playbook={playbook}
                    commits={info.commitHistory}
                    currentCommit={info.latestCommit?.oid}
                    commitRef={commitManagerRef}
                  />
                  <Separator />
                  <RemoteManagerSection
                    repo={repo}
                    info={info}
                    remoteRef={remoteRef}
                    setSelectRemote={setSelectRemote}
                    selectRemote={selectRemote}
                  />
                  <SyncPullPushButtons />
                </>
              )}
              {!info.fullInitialized && info.bareInitialized && (
                <RemoteManagerSection
                  repo={repo}
                  info={info}
                  remoteRef={remoteRef}
                  setSelectRemote={setSelectRemote}
                  selectRemote={selectRemote}
                />
              )}

              {((commitState === "bare-init" && !hasRemotes) || commitState === "init") && (
                <Button
                  className="w-full disabled:cursor-pointer h-8"
                  onClick={handleRemoteInit}
                  size="sm"
                  variant="outline"
                >
                  <Import className="mr-1" />
                  <span className="flex-1 min-w-0 truncate flex justify-center items-center">
                    {commitState === "bare-init" ? "Add Remote" : "Init From Remote"}
                  </span>
                </Button>
              )}
              {commitState === "bare-init" && hasRemotes && (
                <Button
                  className="w-full disabled:cursor-pointer h-8"
                  onClick={handleFetchRemote}
                  size="sm"
                  variant="outline"
                >
                  <Import className="mr-1" />
                  <span className="flex-1 min-w-0 truncate flex justify-center items-center">Fetch Remote</span>
                </Button>
              )}
            </div>
          </SidebarMenu>
        </CollapsibleContent>
      </Collapsible>
      <GitRemoteDialog cmdRef={addRemoteCmdRef} />
    </SidebarGroup>
  );
}
