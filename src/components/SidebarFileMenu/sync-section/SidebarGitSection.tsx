import {
  Check,
  Download,
  Ellipsis,
  GitBranchIcon,
  GitMerge,
  GitPullRequestDraftIcon,
  Import,
  Loader,
  PlusIcon,
  RefreshCw,
  RotateCcw,
  Upload,
  User,
  X,
} from "lucide-react";
import React, { useRef, useState } from "react";

import { SidebarGripChevron } from "@/components/SidebarFileMenu/publish-section/SidebarGripChevron";
import { GitAuthorDialog, useGitAuthorDialogCmd } from "@/components/SidebarFileMenu/sync-section/GitAuthorDialog";
import { RefsManagerSection } from "@/components/SidebarFileMenu/sync-section/GitBranchManager";
import { GitRemoteDialog, useGitRemoteDialogCmd } from "@/components/SidebarFileMenu/sync-section/GitRemoteDialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { TooltipToast, useTooltipToastCmd } from "@/components/ui/TooltipToast";
import { useGitAuthorSettings } from "@/features/git-repo/useGitAuthorSettings";
import { WorkspaceRepoType } from "@/features/git-repo/useGitHooks";
import { useWorkspaceGitRepo } from "@/features/git-repo/useWorkspaceGitRepo";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { useTimeAgoUpdater } from "@/hooks/useTimeAgoUpdater";
import { NotFoundError } from "@/lib/errors";
import { useErrorToss } from "@/lib/errorToss";
import { cn } from "@/lib/utils";
import { RepoInfoType } from "../../../features/git-repo/GitRepo";
import { useConfirm } from "../../Confirm";
import { CommitManagerSection } from "./CommitManagerSection";
import { RemoteManagerSection } from "./GitRemoteManager";

function InfoCollapsible({ info }: { info: WorkspaceRepoType }) {
  return (
    <details className="w-full">
      <summary className="cursor-pointer text-2xs font-mono">Info</summary>
      <div className="w-full mt-2">
        <LatestInfo info={info} />
      </div>
    </details>
  );
}
function LatestInfo({ info }: { info: WorkspaceRepoType }) {
  const { latestCommit, conflictingFiles, isMerging, currentBranch, hasChanges } = info;
  const timeAgo = useTimeAgoUpdater({ date: new Date(latestCommit.date) });
  if (!latestCommit) {
    return null;
  }
  return (
    <dl className="mb-4 grid [grid-template-columns:max-content_1fr] gap-x-2 font-mono text-2xs text-left">
      <dt className="font-bold">branch:</dt>
      <dd className="truncate">{currentBranch || <i>none / detached</i>}</dd>
      <dt className="font-bold">commit:</dt>
      <dd className="truncate">{latestCommit.oid}</dd>
      <dt className="font-bold">has changes:</dt>
      <dd className="truncate">{hasChanges ? <b className="font-bold">yes</b> : "no"}</dd>
      <dt className="font-bold">date:</dt>
      <dd className="truncate">{new Date(latestCommit.date).toLocaleString()}</dd>
      <dt className="font-bold">time ago:</dt>
      <dd className="truncate">{timeAgo}</dd>

      {isMerging && (
        <>
          <dt className="font-bold">merging:</dt>
          <dd className="truncate">
            <b>true</b>
          </dd>
          <dt className="font-bold">conflicting files:</dt>
          <dd>
            <details className="group">
              <summary
                data-file-count={`(${conflictingFiles.length})`}
                className="font-bold cursor-pointer list-none flex items-center gap-1 
             after:content-['▶_show_'_attr(data-file-count)] 
             group-open:after:content-['▼_hide']"
              >
                <span className="sr-only">hide/show</span>
              </summary>
              <ul>
                {conflictingFiles.map((f) => (
                  <li key={f} className="truncate">
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </details>
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
  commitRef,
  mergeCommit,
  setShowMessageInput,
  setPending,
}: {
  commitState: CommitState;
  commit: (message: string) => void;
  mergeCommit: () => void;
  initialCommit: () => void;
  commitRef: React.RefObject<{
    show: (text?: string, variant?: "destructive" | "info" | "success") => void;
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
    try {
      if (commitState === "merge-commit") return handleMergeCommit();
      if (commitState === "init" || commitState == "bare-init") return handleInitialCommit();
      if (commitState === "commit") return setShowMessageInput(true);
    } catch (error) {
      console.error("Error during commit action:", error);
      setPending(false);
      commitRef.current?.show("Error during commit action");
    }
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
    <GridButton
      className="w-full disabled:cursor-pointer h-8"
      onClick={handleButtonClick}
      size="sm"
      variant="outline"
      disabled={commitState === "pending" || commitState === "commit-disabled" || commitState === "detatched"}
      icon={ActionButtonIcons[commitState]}
      iconClassName={commitState === "pending" ? "animate-spin" : ""}
    >
      {ActionButtonLabels[commitState]}
    </GridButton>
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

// Reusable grid-based button component for consistent icon + text layout
const GridButton = ({
  icon: Icon,
  iconClassName,
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button> & {
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  children: React.ReactNode;
}) => {
  return (
    <Button className={cn("grid grid-cols-[auto_1fr] items-center justify-center", className)} {...props}>
      <Icon className={cn("justify-self-center", iconClassName)} />
      <span>{children}</span>
    </Button>
  );
};

function SyncPullPushButtons({
  onSync,
  onPull,
  onPush,
  disabled = false,
  syncRef,
  pullRef,
  pushRef,
}: {
  onSync: () => void;
  onPull: () => void;
  onPush: () => void;
  disabled?: boolean;
  syncRef: React.RefObject<{ show: (text?: React.ReactNode, variant?: "destructive" | "info" | "success") => void }>;
  pullRef: React.RefObject<{ show: (text?: React.ReactNode, variant?: "destructive" | "info" | "success") => void }>;
  pushRef: React.RefObject<{ show: (text?: React.ReactNode, variant?: "destructive" | "info" | "success") => void }>;
}) {
  return (
    <div className="grid gap-2 grid-cols-1">
      <GridButton icon={RefreshCw} size="sm" variant="outline" onClick={onSync} disabled={disabled}>
        <TooltipToast cmdRef={syncRef} sideOffset={10} />
        Sync Now
      </GridButton>

      <GridButton icon={Download} size="sm" variant="outline" onClick={onPull} disabled={disabled}>
        <TooltipToast cmdRef={pullRef} sideOffset={10} />
        Pull
      </GridButton>

      <GridButton icon={Upload} size="sm" variant="outline" onClick={onPush} disabled={disabled}>
        <TooltipToast cmdRef={pushRef} sideOffset={10} />
        Push
      </GridButton>
    </div>
  );
}

function useInPlaceConfirmCmd() {
  const cmdRef = useRef<{
    open: <U extends () => unknown>(
      message: string,
      cb?: U,
      options?: {
        variant?: "destructive" | "default";
        confirmText?: string;
        cancelText?: string;
      }
    ) => Promise<ReturnType<U> | null>;
  }>({
    open: async () => null,
  });

  return {
    open: <U extends () => unknown>(
      message: string,
      cb?: U,
      options?: {
        variant?: "destructive" | "default";
        confirmText?: string;
        cancelText?: string;
      }
    ) => cmdRef.current.open(message, cb, options),
    cmdRef,
  };
}

export function SidebarGitSection(props: React.ComponentProps<typeof SidebarGroup>) {
  const { repo, playbook, info } = useWorkspaceGitRepo();
  const [expanded, setExpand] = useSingleItemExpander("sync");
  const { cmdRef: commitRef } = useTooltipToastCmd();
  const { cmdRef: remoteRef } = useTooltipToastCmd();
  const { cmdRef: branchRef } = useTooltipToastCmd();
  const { cmdRef: commitManagerRef } = useTooltipToastCmd();
  const { cmdRef: fetchRef } = useTooltipToastCmd();
  const { cmdRef: syncRef } = useTooltipToastCmd();
  const { cmdRef: pullRef } = useTooltipToastCmd();
  const { cmdRef: pushRef } = useTooltipToastCmd();
  const { cmdRef: initFromRemoteRef } = useTooltipToastCmd();

  const { gitAuthor, setGitAuthor } = useGitAuthorSettings();
  const gitAuthorDialogRef = useGitAuthorDialogCmd();

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
  const coalescedRemote =
    selectRemote || info.remotes.find((r) => r.name === "origin")?.name || info.remotes[0]?.name || null;

  const [fetchPending, setFetchPending] = useState(false);
  const commitState = ((): CommitState => {
    // console.log(bareInitialized, fullInitialized);
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
    let remote = null;
    try {
      const remoteName = coalescedRemote;
      if (!remoteName) return console.error("No remote selected");
      remote = await repo.getRemote(remoteName);

      if (!remote) throw new NotFoundError("remote not found");
    } catch (e) {
      return tossError(e as Error);
    }
    try {
      setFetchPending(true);
      await playbook.fetchRemote(remote.name);
      fetchRef.current?.show(
        <span className="flex items-center gap-2 justify-center">
          <Check size={10} />
          Fetch completed
        </span>
      );
    } catch (err) {
      fetchRef.current?.show(
        <span className="flex items-center gap-2 justify-center w-full h-full">
          <X size={10} />
          Error Fetching! (check console)
        </span>,
        "destructive"
      );
      console.error("Error fetching remote:", err);
    } finally {
      setFetchPending(false);
    }
  };

  const handleRemoteInit = () => {
    // void repo.mustBeInitialized();
    void addRemoteCmdRef.current.open("add").then(async ({ next }) => {
      try {
        if (!next) return;
        await playbook.initFromRemote(next);
        commitRef.current?.show("Remote added and fetched");
      } catch (err) {
        console.error(err);
        commitRef.current?.show("Could not fetch from remote", "destructive");
      }
    });
  };

  const handleConfigureAuthor = () => {
    void gitAuthorDialogRef.current.open(gitAuthor).then(({ author }) => {
      if (author) {
        setGitAuthor(author);
        commitRef.current?.show("Git author updated");
      }
    });
  };

  const handleSyncRemote = async () => {
    if (!coalescedRemote) return;
    try {
      setFetchPending(true);
      // First pull, then push
      await playbook.pull({ remote: coalescedRemote });
      await playbook.push({ remote: coalescedRemote });
      syncRef.current?.show(
        <span className="flex items-center gap-2 justify-center">
          <Check size={10} />
          Sync completed
        </span>
      );
    } catch (err) {
      syncRef.current?.show(
        <span className="flex items-center gap-2 justify-center w-full h-full">
          <X size={10} />
          Sync failed!
        </span>,
        "destructive"
      );
      console.error("Error syncing remote:", err);
    } finally {
      setFetchPending(false);
    }
  };

  const handlePullRemote = async () => {
    if (!coalescedRemote) return;
    try {
      setFetchPending(true);
      await playbook.pull({ remote: coalescedRemote });
      pullRef.current?.show(
        <span className="flex items-center gap-2 justify-center">
          <Check size={10} />
          Pull completed
        </span>
      );
    } catch (err) {
      pullRef.current?.show(
        <span className="flex items-center gap-2 justify-center w-full h-full">
          <X size={10} />
          Pull failed!
        </span>,
        "destructive"
      );
      console.error("Error pulling from remote:", err);
    } finally {
      setFetchPending(false);
    }
  };

  const handlePushRemote = async () => {
    if (!coalescedRemote) return;
    try {
      setFetchPending(true);
      await playbook.push({ remote: coalescedRemote });
      pushRef.current?.show(
        <span className="flex items-center gap-2 justify-center">
          <Check size={10} />
          Push completed
        </span>
      );
    } catch (err) {
      pushRef.current?.show(
        <span className="flex items-center gap-2 justify-center w-full h-full">
          <X size={10} />
          Push failed!
        </span>,
        "destructive"
      );
      console.error("Error pushing to remote:", err);
    } finally {
      setFetchPending(false);
    }
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

        <div className="group-data-[state=closed]/collapsible:hidden">
          <GitManager
            info={info}
            resetRepo={repo.reset}
            initRepo={() => playbook.initialCommit()}
            onConfigureAuthor={handleConfigureAuthor}
          />
        </div>

        <CollapsibleContent className="flex flex-col flex-shrink overflow-y-auto">
          <SidebarMenu className="pb-3">
            <div className="px-4 pt-2 gap-2 flex flex-col">
              {/* <InPlaceConfirmSection cmdRef={confirmPaneRef} /> */}

              {exists && <InfoCollapsible info={info} />}
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
                    hasChanges={info.hasChanges}
                    hasParent={info.hasChanges && info.parentOid !== null}
                  />
                  <Separator />
                </>
              )}
              {(info.bareInitialized || info.currentRef) && (
                <RemoteManagerSection
                  repo={repo}
                  info={info}
                  remoteRef={remoteRef}
                  setSelectRemote={setSelectRemote}
                  selectRemote={coalescedRemote}
                />
              )}
              {hasRemotes && (
                <div className="flex justify-center items-center w-full flex-col gap-4">
                  <GridButton
                    className="w-full disabled:cursor-pointer h-8"
                    onClick={handleFetchRemote}
                    size="sm"
                    disabled={fetchPending}
                    variant="outline"
                    icon={fetchPending ? Loader : Import}
                    iconClassName={fetchPending ? "animate-spin" : "!h-4 !w-4 !stroke-1"}
                  >
                    <TooltipToast cmdRef={fetchRef} sideOffset={10} />
                    Fetch Remote
                  </GridButton>
                </div>
              )}
              {info.fullInitialized && info.currentRef && coalescedRemote && (
                <SyncPullPushButtons
                  onSync={() => handleSyncRemote()}
                  onPull={() => handlePullRemote()}
                  onPush={() => handlePushRemote()}
                  disabled={fetchPending}
                  syncRef={syncRef}
                  pullRef={pullRef}
                  pushRef={pushRef}
                />
              )}

              {((commitState === "bare-init" && !hasRemotes) || commitState === "init") && (
                <GridButton
                  className="w-full disabled:cursor-pointer h-8"
                  onClick={handleRemoteInit}
                  size="sm"
                  variant="outline"
                  icon={Import}
                  iconClassName="!w-4 !h-4"
                >
                  <TooltipToast cmdRef={initFromRemoteRef} sideOffset={10} />
                  {commitState === "bare-init" ? "Add Remote" : "Init From Remote"}
                </GridButton>
              )}
              {/* <Button onClick={() => openConfirmPane("foobar")}>Foo Bar</Button> */}
            </div>
          </SidebarMenu>
        </CollapsibleContent>
      </Collapsible>
      <GitRemoteDialog cmdRef={addRemoteCmdRef} />
      <GitAuthorDialog cmdRef={gitAuthorDialogRef} />
    </SidebarGroup>
  );
}

// export { useInPlaceConfirmCmd };

function GitManager({
  info,
  initRepo,
  resetRepo,
  onConfigureAuthor,
}: {
  info: RepoInfoType;
  initRepo: () => void;
  resetRepo: () => void;
  onConfigureAuthor: () => void;
}) {
  const { open } = useConfirm();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarGroupAction className="top-1.5 p-0" title="Git Menu">
          <Ellipsis /> <span className="sr-only">Git Menu</span>
        </SidebarGroupAction>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={info.bareInitialized} onClick={initRepo}>
          <PlusIcon /> Initialize Repo
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onConfigureAuthor}>
          <User /> Configure Author
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled={!info.bareInitialized}
          onClick={() =>
            open(
              resetRepo,
              "Reset Repo",
              "Are you sure you want to reset the repository? This will clear ALL git files and history. This action cannot be undone."
            )
          }
        >
          <RotateCcw /> Reset Repo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
