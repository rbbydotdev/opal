import {
  Check,
  Download,
  GitBranchIcon,
  GitMerge,
  GitPullRequestDraftIcon,
  Import,
  Loader,
  PlusIcon,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import React, { useEffect, useImperativeHandle, useRef, useState } from "react";

import { SidebarGripChevron } from "@/components/SidebarFileMenu/publish-section/SidebarGripChevron";
import { RefsManagerSection } from "@/components/SidebarFileMenu/sync-section/GitBranchManager";
import { GitRemoteDialog, useGitRemoteDialogCmd } from "@/components/SidebarFileMenu/sync-section/GitRemoteDialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton } from "@/components/ui/sidebar";
import { TooltipToast, useTooltipToastCmd } from "@/components/ui/TooltipToast";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { WorkspaceRepoType } from "@/features/git-repo/useGitHooks";
import { useRepoInfo } from "@/features/git-repo/useRepoInfo";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { useTimeAgoUpdater } from "@/hooks/useTimeAgoUpdater";
import { NotFoundError } from "@/lib/errors";
import { useErrorToss } from "@/lib/errorToss";
import { cn } from "@/lib/utils";
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
  detatched: "detatched",
};

const GitActionButtonLabel = ({ commitState }: { commitState?: CommitState }) => {
  if (!commitState) return null;
  const Icon = ActionButtonIcons[commitState];
  const labelStr = ActionButtonLabels[commitState];
  if (!Icon || !labelStr) return null;
  return (
    <>
      <Icon className="mr-1 !w-4 !h-4" />
      <span className="flex-1 min-w-0 truncate flex justify-center items-center">{labelStr}</span>
    </>
  );
};

function SyncPullPushButtons() {
  return (
    <>
      <div>
        <Button className="w-full flex" size="sm" variant="outline">
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

function InPlaceConfirmSection({
  cmdRef,
}: {
  cmdRef: React.ForwardedRef<{
    open: <U extends () => unknown>(
      message: string,
      cb?: U,
      options?: {
        variant?: "destructive" | "default";
        confirmText?: string;
        cancelText?: string;
      }
    ) => Promise<ReturnType<U> | null>;
  }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [variant, setVariant] = useState<"destructive" | "default">("destructive");
  const [confirmText, setConfirmText] = useState("OK");
  const [cancelText, setCancelText] = useState("Cancel");
  const deferredPromiseRef = useRef<PromiseWithResolvers<unknown> | null>(null);
  const openHandlerCb = useRef<((resolve: "ok" | "cancel") => Promise<unknown> | unknown) | null>(null);

  const handleCancel = async () => {
    await openHandlerCb.current?.("cancel");
    setIsOpen(false);
    openHandlerCb.current = null;
    deferredPromiseRef.current = null;
  };

  const handleConfirm = async () => {
    await openHandlerCb.current?.("ok");
    setIsOpen(false);
    openHandlerCb.current = null;
    deferredPromiseRef.current = null;
  };

  useEffect(() => {
    return () => {
      openHandlerCb.current = null;
      deferredPromiseRef.current = null;
    };
  }, []);

  useImperativeHandle(cmdRef, () => ({
    open: <U extends () => unknown>(
      message: string,
      cb?: U,
      options?: {
        variant?: "destructive" | "default";
        confirmText?: string;
        cancelText?: string;
      }
    ) => {
      deferredPromiseRef.current = Promise.withResolvers();
      setMessage(message);
      setVariant(options?.variant || "destructive");
      setConfirmText(options?.confirmText || "OK");
      setCancelText(options?.cancelText || "Cancel");
      setIsOpen(true);
      openHandlerCb.current = (okOrCancel) => {
        try {
          if (okOrCancel === "ok") {
            deferredPromiseRef.current?.resolve(cb ? cb() : null);
          }
          if (okOrCancel === "cancel") {
            deferredPromiseRef.current?.resolve(null);
          }
        } catch (error) {
          deferredPromiseRef.current?.reject(error);
        }
      };
      // Use NonNullable to ensure a function type when deriving ReturnType
      return deferredPromiseRef.current.promise as Promise<ReturnType<NonNullable<typeof cb>> | null>;
    },
  }));

  if (!isOpen) return null;

  return (
    <div
      className={cn("w-full border p-4 rounded-lg gap-4 flex flex-wrap justify-center items-center", {
        "border-destructive": variant === "destructive",
        "border-border": variant === "default",
      })}
    >
      <div className="text-2xs mb-2 uppercase min-w-[50%]">{message}</div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={handleCancel}>
          {cancelText}
        </Button>
        <Button size="sm" variant={variant} onClick={handleConfirm}>
          {confirmText}
        </Button>
      </div>
    </div>
  );
}

export function SidebarGitSection(props: React.ComponentProps<typeof SidebarGroup>) {
  const { repo, playbook } = useWorkspaceContext().git;
  const info = useRepoInfo(repo);
  const [expanded, setExpand] = useSingleItemExpander("sync");
  const { cmdRef: commitRef } = useTooltipToastCmd();
  const { cmdRef: remoteRef } = useTooltipToastCmd();
  const { cmdRef: branchRef } = useTooltipToastCmd();
  const { cmdRef: commitManagerRef } = useTooltipToastCmd();
  const { cmdRef: fetchRef } = useTooltipToastCmd();
  const { cmdRef: initFromRemoteRef } = useTooltipToastCmd();

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
  const { open: openConfirmPane, cmdRef: confirmPaneRef } = useInPlaceConfirmCmd();

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

  // console.log(repo.br);
  // useEffect(() => {
  //   void (async () => {
  //     console.log(info.bareInitialized, await repo.fullInitialized(), await repo.currentBranch().catch(() => null));
  //   })();
  // }, [info, repo]);

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
      // openConfirmPane("error fetching");
      fetchRef.current?.show(
        <span className="flex items-center gap-2 justify-center w-full h-full">
          <X size={10} />
          Error Fetching!
        </span>,
        "destructive"
      );
      console.error("Error fetching remote:", err);
    } finally {
      setFetchPending(false);
    }
  };

  const handleRemoteInit = () => {
    void repo.mustBeInitialized();
    void addRemoteCmdRef.current.open("add").then(async ({ next }) => {
      try {
        if (!next) return;
        await playbook.addRemoteAndFetch(next);
        commitRef.current?.show("Remote added and fetched");
      } catch (err) {
        // tossError(err as Error);
        console.error(err);
        commitRef.current?.show("Could not fetch from remote", "destructive");
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
            <div className="px-4 pt-2 gap-2 flex flex-col">
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
                  <Button
                    className="w-full disabled:cursor-pointer h-8"
                    onClick={handleFetchRemote}
                    size="sm"
                    disabled={fetchPending}
                    variant="outline"
                  >
                    {fetchPending ? (
                      <Loader className="mr-1 animate-spin" />
                    ) : (
                      <Import className="mr-1 !h-4 !w-4 !stroke-1" />
                    )}
                    <TooltipToast cmdRef={fetchRef} sideOffset={10} />
                    Fetch Remote
                  </Button>
                  <InPlaceConfirmSection cmdRef={confirmPaneRef} />
                </div>
              )}
              {info.fullInitialized && info.currentRef && <SyncPullPushButtons />}

              {((commitState === "bare-init" && !hasRemotes) || commitState === "init") && (
                <Button
                  className="w-full disabled:cursor-pointer h-8"
                  onClick={handleRemoteInit}
                  size="sm"
                  variant="outline"
                >
                  <Import className="mr-1 !w-4 !h-4" />
                  <span className="flex-1 min-w-0 truncate flex justify-center items-center">
                    <TooltipToast cmdRef={initFromRemoteRef} sideOffset={10} />
                    {commitState === "bare-init" ? "Add Remote" : "Init From Remote"}
                  </span>
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

// export { useInPlaceConfirmCmd };
