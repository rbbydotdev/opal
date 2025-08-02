"use client";

import {
  ChevronRight,
  Download,
  GitBranchIcon,
  GitMerge,
  Loader,
  Plus,
  PlusIcon,
  RefreshCw,
  Upload,
} from "lucide-react";
import React from "react";

import { ConnectionsModal } from "@/components/connections-modal";
import { BranchManagerSection } from "@/components/SidebarFileMenu/sync-section/GitBranchManager";
import { CommitManagerSection } from "@/components/SidebarFileMenu/sync-section/GitCommitManager";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { TooltipToast, useTooltipToastCmd } from "@/components/ui/TooltipToast";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { useUIGitPlaybook, useWorkspaceRepo, WorkspaceRepoType } from "@/features/git-repo/useGitHooks";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { useTimeAgoUpdater } from "@/hooks/useTimeAgoUpdater";
import { RemoteManagerSection } from "./GitRemoteManager";

function LatestInfo({ info }: { info: WorkspaceRepoType }) {
  const { latestCommit, currentBranch, hasChanges } = info;
  const timeAgo = useTimeAgoUpdater({ date: new Date(latestCommit.date) });
  if (!latestCommit) {
    return null;
  }
  return (
    <dl className="mb-4 grid [grid-template-columns:max-content_1fr] gap-x-2 font-mono text-2xs text-left">
      <dt className="font-bold">commit:</dt>
      <dd className="truncate">{latestCommit.oid}</dd>
      <dt className="font-bold">branch:</dt>
      <dd className="truncate">{currentBranch || <i>none / detatched</i>}</dd>
      <dt className="font-bold">has changes:</dt>
      <dd className="truncate">{hasChanges ? "yes" : "no"}</dd>
      <dt className="font-bold">date:</dt>
      <dd className="truncate">{new Date(latestCommit.date).toLocaleString()}</dd>
      <dt className="font-bold">time ago:</dt>
      <dd className="truncate">{timeAgo}</dd>
    </dl>
  );
}

function CommitOrInitButton({
  commit,
  isPending,
  exists,
  pendingCommand,
  commitRef,
}: {
  exists: boolean;
  commit: () => Promise<void>;
  isPending: boolean;
  pendingCommand: string;
  commitRef: React.RefObject<{
    show: (text?: string) => void;
  }>;
}) {
  return (
    <Button
      className="w-full"
      onClick={() => {
        void commit().then(() => commitRef.current.show());
      }}
      size="sm"
      variant="outline"
      disabled={isPending}
    >
      {pendingCommand === "commit" ? (
        <Loader className="mr-1 animate-spin animation-iteration-infinite" />
      ) : exists ? (
        <GitMerge className="mr-1" />
      ) : (
        <PlusIcon className="mr-1" />
      )}
      <TooltipToast cmdRef={commitRef} message={"commited"} durationMs={1000} sideOffset={10} />
      {exists ? "Commit" : "Initialize Git Repo"}
    </Button>
  );
}

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
  const { repo, playbook, info, exists } = useWorkspaceRepo(currentWorkspace);
  const { pendingCommand, commit, isPending } = useUIGitPlaybook(repo);
  const [expanded, setExpand] = useSingleItemExpander("sync");
  const { cmdRef: commitRef } = useTooltipToastCmd();
  const { cmdRef: remoteRef } = useTooltipToastCmd();
  const { cmdRef: branchRef } = useTooltipToastCmd();
  const { cmdRef: commitManagerRef } = useTooltipToastCmd();

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

        <div className="group-data-[state=closed]/collapsible:hidden">
          <ConnectionsModal>
            <SidebarGroupAction className="top-1.5">
              <Plus /> <span className="sr-only">Add Connection</span>
            </SidebarGroupAction>
          </ConnectionsModal>
        </div>

        <CollapsibleContent className="flex flex-col flex-shrink overflow-y-auto">
          <SidebarMenu className="gap-2">
            <div className="px-4 pt-2">
              {exists && <LatestInfo info={info} />}
              <CommitOrInitButton
                exists={exists}
                commit={commit}
                isPending={isPending}
                pendingCommand={pendingCommand ?? ""}
                commitRef={commitRef}
              />
            </div>
            {exists && (
              <>
                <BranchManagerSection
                  repo={repo}
                  playbook={playbook}
                  // defaultBranch={repo.defaultBranch}
                  branch={info.currentBranch}
                  branches={info.branches}
                  branchRef={branchRef}
                />
                <CommitManagerSection
                  playbook={playbook}
                  commits={info.commitHistory}
                  currentCommit={info.latestCommit?.oid}
                  commitRef={commitManagerRef}
                />
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
