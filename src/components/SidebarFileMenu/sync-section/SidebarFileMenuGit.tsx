import {
  ChevronRight,
  Download,
  GitBranchIcon,
  GitMerge,
  GitPullRequestDraftIcon,
  Loader,
  PlusIcon,
  RefreshCw,
  Upload,
} from "lucide-react";
import React, { useMemo, useState } from "react";

import {
  BranchManagerSection,
  createBranchRef,
  createCommitRef,
  GitRef,
} from "@/components/SidebarFileMenu/sync-section/GitBranchManager";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton } from "@/components/ui/sidebar";
import { TooltipToast, useTooltipToastCmd } from "@/components/ui/TooltipToast";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { useWorkspaceRepo, WorkspaceRepoType } from "@/features/git-repo/useGitHooks";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { useTimeAgoUpdater } from "@/hooks/useTimeAgoUpdater";
import { useNavigate } from "@tanstack/react-router";
import { CommitManagerSection } from "./CommitManagerSection";
import { RemoteManagerSection } from "./GitRemoteManager";

function LatestInfo({ info }: { info: WorkspaceRepoType }) {
  const { latestCommit, context, currentBranch, hasChanges } = info;
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
    </dl>
  );
}

type CommitState = "init" | "commit" | "commit-disabled" | "enter-message" | "pending" | "detatched";

function CommitSection({
  exists,
  hasChanges,
  commit,
  initialCommit,
  commitRef,
  currentGitRef,
}: {
  exists: boolean;
  hasChanges: boolean;
  commit: (message: string) => void;
  initialCommit: () => void;
  currentGitRef: GitRef | null;
  commitRef: React.RefObject<{
    show: (text?: string) => void;
  }>;
}) {
  const [commitMessage, setCommitMessage] = useState("");
  const [showMessageInput, setShowMessageInput] = useState(false);

  const commitState = ((): CommitState => {
    if (showMessageInput) return "enter-message";
    if (!exists) return "init";
    if (!hasChanges) return "commit-disabled";
    if (currentGitRef?.type === "commit") return "detatched";
    return "commit";
  })();

  const handleButtonClick = async () => {
    if (commitState === "init") {
      await initialCommit();
      commitRef.current?.show("Repository initialized");
    } else if (commitState === "commit") {
      setShowMessageInput(true);
    } else if (commitState === "detatched") {
      // commitRef.current?.show("You are in a detatched state, please switch to a branch to commit");
    }
  };

  const handleMessageSubmit = async (message: string) => {
    if (message.trim()) {
      setShowMessageInput(false);
      setCommitMessage("");
      await commit(message);
      commitRef.current?.show("Committed");
    }
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
        className="w-full disabled:cursor-pointer"
        onClick={handleButtonClick}
        size="sm"
        variant="outline"
        disabled={commitState === "pending" || commitState === "commit-disabled" || commitState === "detatched"}
      >
        <GitActionButton commitState={commitState} exists={exists} />
      </Button>
      <TooltipToast cmdRef={commitRef} message="Operation completed" durationMs={1000} sideOffset={10} />
    </>
  );
}

const GitActionButton = ({ commitState, exists }: { commitState?: CommitState; exists: boolean }) => {
  switch (commitState) {
    case "pending":
      return (
        <>
          <Loader className="mr-1 animate-spin" />
          {exists ? "Committing..." : "Initializing..."}
        </>
      );
    case "init":
      return (
        <>
          <PlusIcon className="mr-1" />
          Initialize Git Repo
        </>
      );
    case "commit":
      return (
        <>
          <GitMerge className="mr-1" />
          Commit
        </>
      );
    case "commit-disabled":
      return (
        <>
          <GitMerge className="mr-1" />
          No Changes to Commit
        </>
      );
    case "detatched":
      return (
        <>
          <GitPullRequestDraftIcon className="mr-1" />
          Detatched
        </>
      );
    default:
      return null;
  }
};

// 4. SyncPullPushButtons
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
  const { currentWorkspace } = useWorkspaceContext();
  const navigate = useNavigate();
  const { repo, playbook, info } = useWorkspaceRepo(currentWorkspace, () =>
    navigate({ to: currentWorkspace.href.toString() })
  );
  const [expanded, setExpand] = useSingleItemExpander("sync");
  const { cmdRef: commitRef } = useTooltipToastCmd();
  const { cmdRef: remoteRef } = useTooltipToastCmd();
  const { cmdRef: branchRef } = useTooltipToastCmd();
  const { cmdRef: commitManagerRef } = useTooltipToastCmd();

  const currentGitRef = useMemo(() => {
    if (info?.currentBranch) {
      return createBranchRef(info.currentBranch);
    } else if (info?.latestCommit?.oid) {
      return createCommitRef(info?.latestCommit.oid);
    }
    return null;
  }, [info]);

  const exists = info.exists;

  return (
    <SidebarGroup className="pl-0 py-0" {...props}>
      <Collapsible className="group/collapsible flex flex-col min-h-0" open={expanded} onOpenChange={setExpand}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="pl-0">
            <SidebarGroupLabel className="pl-2">
              <div className="flex items-center">
                <ChevronRight
                  size={14}
                  className={
                    "transition-transform duration-100 group-data-[state=open]/collapsible:rotate-90 group-data-[state=closed]/collapsible:rotate-0 -ml-0.5"
                  }
                />
              </div>
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
          <SidebarMenu className="gap-2">
            <div className="px-4 pt-2 gap-2 flex flex-col">
              {exists && <LatestInfo info={info} />}
              <CommitSection
                exists={exists}
                hasChanges={info.hasChanges}
                commit={(message) => playbook.addAllCommit({ message })}
                initialCommit={() => playbook.initialCommit()}
                commitRef={commitRef}
                currentGitRef={currentGitRef}
              />
            </div>
            {exists && currentGitRef !== null && (
              <>
                <BranchManagerSection
                  info={info}
                  repo={repo}
                  playbook={playbook}
                  currentGitRef={currentGitRef}
                  branches={info.branches}
                  branchRef={branchRef}
                />
                <CommitManagerSection
                  refType={currentGitRef.type}
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
          </SidebarMenu>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
