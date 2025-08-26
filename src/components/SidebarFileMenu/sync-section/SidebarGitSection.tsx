import {
  Download,
  GitBranchIcon,
  GitMerge,
  GitPullRequestDraftIcon,
  Import,
  Loader,
  PlusIcon,
  RefreshCw,
  SquareArrowOutUpRightIcon,
  Upload,
} from "lucide-react";
import React, { useState } from "react";

import { SidebarGripChevron } from "@/components/SidebarFileMenu/publish-section/SidebarGripChevron";
import { BranchManagerSection } from "@/components/SidebarFileMenu/sync-section/GitBranchManager";
import { GitRemoteDialog, useGitRemoteDialogCmd } from "@/components/SidebarFileMenu/sync-section/GitRemoteDialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton } from "@/components/ui/sidebar";
import { TooltipToast, useTooltipToastCmd } from "@/components/ui/TooltipToast";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { GitRef, GitRepo } from "@/features/git-repo/GitRepo";
import { WorkspaceRepoType } from "@/features/git-repo/useGitHooks";
import { useRepoInfo } from "@/features/git-repo/useRepoInfo";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { useTimeAgoUpdater } from "@/hooks/useTimeAgoUpdater";
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
  exists,
  hasChanges,
  commit,
  initialCommit,
  initialRepo,
  isMerging,
  commitRef,
  mergeCommit,
  currentGitRef,
  bareInitialized,
  fullInitialized,
  hasRemotes,
  repo,
}: {
  exists: boolean;
  hasChanges: boolean;
  isMerging: boolean;
  commit: (message: string) => void;
  mergeCommit: () => void;
  initialCommit: () => void;
  initialRepo: () => void;
  currentGitRef: GitRef | null;
  commitRef: React.RefObject<{
    show: (text?: string) => void;
  }>;
  hasRemotes?: boolean;
  bareInitialized: boolean;
  fullInitialized: boolean;
  repo: GitRepo;
}) {
  const [commitMessage, setCommitMessage] = useState("");
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [pending, setPending] = useState(false);

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

  const addRemoteCmdRef = useGitRemoteDialogCmd();

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
  const handleRemoteInit = () => {
    initialRepo();
    addRemoteCmdRef.current.open("add");
  };

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
      <GitRemoteDialog
        cmdRef={addRemoteCmdRef}
        onSubmit={({ next }) => {
          // console.log(next)
          void repo.addGitRemote(next);
        }}
      />
      <Button
        className="w-full disabled:cursor-pointer h-8"
        onClick={handleButtonClick}
        size="sm"
        variant="outline"
        disabled={commitState === "pending" || commitState === "commit-disabled" || commitState === "detatched"}
      >
        <GitActionButtonLabel commitState={commitState} /*exists={exists}*/ />
      </Button>
      {commitState === "init" && (
        <Button
          className="w-full disabled:cursor-pointer h-8 truncate"
          onClick={handleRemoteInit}
          size="sm"
          variant="outline"
        >
          <SquareArrowOutUpRightIcon className="mr-1" />
          <span className="flex-1 min-w-0 truncate">Initialize Git Repo From Remote</span>
        </Button>
      )}
      {commitState === "bare-init" && !hasRemotes && (
        <Button className="w-full disabled:cursor-pointer h-8" onClick={handleRemoteInit} size="sm" variant="outline">
          <Import className="mr-1" />
          <span className="flex-1 min-w-0 truncate flex justify-center items-center">Add Remote</span>
        </Button>
      )}
      <TooltipToast cmdRef={commitRef} message="Operation completed" durationMs={1000} sideOffset={10} />
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
      <div className="px-4">
        <Button className="w-full" size="sm" variant="outline">
          <RefreshCw className="mr-1" onClick={() => {}} />
          Sync Now
        </Button>
      </div>
      <div className="px-4">
        <Button className="w-full" size="sm" variant="outline">
          <Download className="mr-1" />
          Pull
        </Button>
      </div>
      <div className="px-4">
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

  const exists = info.exists;

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
          <SidebarMenu className="gap-2 pb-3">
            <div className="px-4 pt-2 gap-2 flex flex-col">
              {exists && <LatestInfo info={info} />}
              <CommitSection
                exists={exists}
                bareInitialized={info.bareInitialized}
                hasRemotes={info.remotes.length > 0}
                hasChanges={info.hasChanges}
                commit={(message) => playbook.addAllCommit({ message })}
                mergeCommit={() => playbook.mergeCommit()}
                isMerging={info.isMerging}
                initialCommit={() => playbook.initialCommit()}
                initialRepo={() => repo.mustBeInitialized()}
                commitRef={commitRef}
                currentGitRef={info.currentRef}
                fullInitialized={info.fullInitialized}
                repo={repo}
              />
            </div>
            {info.fullInitialized && info.currentRef && (
              <>
                <BranchManagerSection
                  info={info}
                  repo={repo}
                  playbook={playbook}
                  currentGitRef={info.currentRef}
                  branches={info.branches}
                  branchRef={branchRef}
                />
                <CommitManagerSection
                  refType={info.currentRef.type}
                  playbook={playbook}
                  commits={info.commitHistory}
                  currentCommit={info.latestCommit?.oid}
                  commitRef={commitManagerRef}
                />
                <Separator className="my-2" />
                <RemoteManagerSection repo={repo} info={info} remoteRef={remoteRef} />
                <SyncPullPushButtons />
              </>
            )}
            {!info.fullInitialized && info.bareInitialized && (
              <RemoteManagerSection repo={repo} info={info} remoteRef={remoteRef} />
            )}
          </SidebarMenu>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
