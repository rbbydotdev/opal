import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipToast } from "@/components/ui/tooltip-toast";
import { GitRef, GitRepo, isBranchRef, isCommitRef, RepoInfoType } from "@/features/git-repo/GitRepo";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Delete,
  Ellipsis,
  GitBranchIcon,
  GitMergeIcon,
  GitPullRequestDraft,
  LockKeyhole,
  Pencil,
  Plus,
} from "lucide-react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useConfirm } from "@/components/ConfirmContext";
import { gitBranchSchema } from "@/components/sidebar/sync-section/gitBranchSchema";
import { SelectHighlight } from "@/components/sidebar/sync-section/SelectHighlight";
import { Input } from "@/components/ui/input";
import { GitPlaybook } from "@/features/git-repo/GitPlaybook";
import { unwrapError } from "@/lib/errors/errors";
import { Remote } from "comlink";

function GitBranchManager({
  refs,
  addGitBranch,
  setCurrentBranch,
  defaultBranch,
  mergeGitBranch,
  replaceGitBranch,
  deleteGitBranch,
  currentGitRef,
}: {
  refs: string[];
  defaultBranch: string;
  addGitBranch: (baseRef: GitRef, branch: GitBranchFormValue) => void;
  replaceGitBranch: (previous: GitBranchFormValue, next: GitBranchFormValue) => void;
  mergeGitBranch: ({ from, into }: { from: string; into: string }) => void;
  setCurrentBranch: (branch: string) => void;
  deleteGitBranch: (remoteName: string) => void;
  currentGitRef: GitRef | null;
}) {
  // const [selectKey, setSelectKey] = useState(0);
  const [selectMode, setSelectMode] = useState<"select" | "delete" | "merge">("select");
  const [open, setOpen] = useState(false);
  const [inputMode, setInputMode] = useState<GitBranchInputModeType>(GitBranchInputModes.ADD);
  const [showInput, setShowInput] = useState(false);
  if (selectMode === "merge" && currentGitRef?.value) {
    return (
      <SelectHighlight
        placeholder="Select Branch to Merge"
        itemClassName="focus:bg-ring focus:text-primary-foreground"
        items={refs.filter((b) => b !== currentGitRef?.value)}
        onCancel={() => setSelectMode("select")}
        onSelect={(name: string) => {
          mergeGitBranch({ from: name, into: currentGitRef.value }); //.catch(() => setCurrentBranch(""));
        }}
      />
    );
  } else if (selectMode === "delete") {
    return (
      <SelectHighlight
        placeholder="Select Branch to Delete"
        itemClassName="focus:bg-destructive focus:text-primary-foreground"
        items={refs.filter((b) => b !== defaultBranch)}
        onCancel={() => setSelectMode("select")}
        onSelect={(name: string) => {
          deleteGitBranch(name);
        }}
      />
    );
  } else if (showInput && currentGitRef) {
    const friendlyName = isBranchRef(currentGitRef) ? currentGitRef.value : currentGitRef.value.slice(0, 7);
    return (
      <GitBranchInput
        mode={inputMode}
        setShow={setShowInput}
        previous={{ branch: friendlyName }}
        onSubmit={({ next, mode }) => {
          if (mode === "add") {
            addGitBranch(currentGitRef, next);
          }
          if (mode === "edit" && isBranchRef(currentGitRef)) {
            replaceGitBranch({ branch: currentGitRef.value }, next);
          }
        }}
      />
    );
  } else {
    /* select branch */
    return (
      <BranchSelect
        defaultBranch={defaultBranch}
        branches={refs}
        currentGitRef={currentGitRef}
        value={
          currentGitRef && isBranchRef(currentGitRef) && refs.includes(currentGitRef.value) ? currentGitRef.value : null
        }
        onSelect={(value: string) => {
          setCurrentBranch(value);
        }}
      >
        <GitBranchMenuDropDown open={open} setOpen={setOpen}>
          <DropdownMenuItem
            onClick={() => {
              setInputMode("add");
              setShowInput(true);
            }}
            onSelect={() => {
              setInputMode("add");
              setShowInput(true);
            }}
          >
            <Plus /> Add Branch
          </DropdownMenuItem>
          {refs.length > 1 && currentGitRef && isBranchRef(currentGitRef) && (
            <DropdownMenuItem
              onClick={() => {
                setSelectMode("merge");
              }}
            >
              <GitMergeIcon /> Merge With …
            </DropdownMenuItem>
          )}
          {refs.length > 1 && currentGitRef && isBranchRef(currentGitRef) && (
            <DropdownMenuItem onClick={() => setSelectMode("delete")}>
              <Delete className="text-destructive" /> Delete Branch
            </DropdownMenuItem>
          )}
          {currentGitRef && isBranchRef(currentGitRef) ? (
            <DropdownMenuItem
              disabled={currentGitRef.value === defaultBranch}
              onClick={() => {
                setInputMode("edit");
                setShowInput(true);
              }}
              onSelect={() => {
                setInputMode("edit");
                setShowInput(true);
              }}
            >
              <Pencil />
              Rename Branch
            </DropdownMenuItem>
          ) : null}
        </GitBranchMenuDropDown>
      </BranchSelect>
    );
  }
}

const GitBranchMenuDropDown = ({
  children,
  open,
  setOpen,
}: {
  children: React.ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
}) => (
  <DropdownMenu onOpenChange={setOpen} open={open}>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" className="h-8" size="sm" title="Branch Menu">
        <Ellipsis /> <span className="sr-only">Branch Menu</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">{children}</DropdownMenuContent>
  </DropdownMenu>
);

const BranchSelectPlaceHolder = ({
  currentGitRef,
  hasBranches,
}: {
  currentGitRef: GitRef | null;
  hasBranches: boolean;
}) => (
  <div className="w-full truncate flex items-center">
    <div className="p-1 mr-2">
      <GitPullRequestDraft className="stroke-ring flex-shrink-0 w-4 h-4" />
    </div>
    <div className="min-w-0 truncate">
      {!hasBranches
        ? "Bare Repo"
        : currentGitRef && isCommitRef(currentGitRef)
          ? `Detached at ${currentGitRef.value.slice(0, 7) || currentGitRef.value}`
          : "Detached"}
    </div>
  </div>
);

function BranchSelect({
  className,
  children,
  branches,
  onSelect,
  value,
  defaultBranch,
  currentGitRef,
}: {
  className?: string;
  defaultBranch: string;
  children?: React.ReactNode;
  branches: string[];
  onSelect: (value: string) => void;
  value: string | null;
  currentGitRef: GitRef | null;
}) {
  const keyRef = React.useRef(0);
  return (
    <div className="w-full flex items-center justify-between space-x-2">
      <div className="w-full">
        <Select
          value={value ?? undefined}
          key={String(value) + keyRef.current}
          onValueChange={(v) => {
            keyRef.current += 1;
            onSelect(v);
          }}
        >
          <SelectTrigger
            title="Select Branch"
            disabled={branches.length === 0}
            className={cn(
              className,
              "grid grid-cols-[1fr,auto] whitespace-normal truncate w-full bg-background text-xs h-8"
            )}
          >
            <SelectValue
              className="w-full"
              placeholder={<BranchSelectPlaceHolder hasBranches={!!branches.length} currentGitRef={currentGitRef} />}
            />
          </SelectTrigger>
          <SelectContent>
            {branches.map((branch) => (
              <SelectItem key={branch} value={branch} className={"!text-xs"}>
                <div className="flex gap-2 items-center justify-start ">
                  {branch === defaultBranch ? (
                    <LockKeyhole className="flex-shrink-0 w-4 h-4" />
                  ) : (
                    <GitBranchIcon className="flex-shrink-0 w-4 h-4" />
                  )}
                  <span className="truncate">{branch}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function RefsManagerSection({
  repo,
  info,
  remoteRefs,
  currentGitRef,
  playbook,
  branches,
  branchRef,
}: {
  remoteRefs?: string[];
  info: RepoInfoType;
  repo: GitRepo | Remote<GitRepo>;
  playbook: GitPlaybook;
  currentGitRef: GitRef | null;
  branches: string[];
  branchRef: React.RefObject<{
    show: (text?: string, variant?: "info" | "destructive" | "success", duration?: number) => void;
  }>;
}) {
  const { open: openConfirm } = useConfirm();
  const [selectKey, setSelectKey] = useState(0);
  if (!branches) return null;

  const handleError = (e: unknown, action: string) => {
    console.error(e);
    branchRef.current.show(`${action} failed - ` + unwrapError(e), "destructive", 5_000);
    setSelectKey((k) => k + 1);
  };
  const addGitBranch = (baseRef: GitRef, branch: GitBranchFormValue) => {
    try {
      // For branches, use the branch name as base
      // For commits, use the commit hash as base
      void repo.addGitBranch({ branchName: branch.branch, symbolicRef: baseRef.value, checkout: true });
      branchRef.current.show("branch added");
    } catch (e) {
      handleError(e, "Add branch");
    }
  };
  const renameGitBranch = (remoteName: GitBranchFormValue, remote: GitBranchFormValue) => {
    try {
      void playbook.replaceGitBranch(remoteName.branch, remote.branch);
      branchRef.current.show("branch renamed");
    } catch (e) {
      handleError(e, "Rename branch");
    }
  };
  const deleteGitBranch = (remoteName: string) => {
    void repo.deleteGitBranch(remoteName);
    branchRef.current.show("branch deleted");
  };
  const mergeGitBranch = async ({ from, into }: { from: string; into: string }) => {
    try {
      const result = await playbook.merge({ from, into });
      if (result) {
        branchRef.current.show("branch merged");
      } else {
        handleError("Merge failed", "Merge branch");
      }
    } catch (e) {
      handleError(e, "Merge branch");
    }
  };
  const setCurrentBranch = async (branch: string) => {
    // console.log("setCurrentBranch", branch);
    try {
      if (branch === currentGitRef?.value) return;
      if (info.hasChanges && currentGitRef?.type === "commit") {
        await openConfirm(
          playbook.newBranchFromCurrentOrphan,
          "Uncommitted Changes",
          "You have uncommitted changes on an orphaned commit. Save as new branch?"
        );
      }
      await playbook.switchBranch(branch);
    } catch (e) {
      handleError(e, "Switch branch");
    }
  };
  return (
    <div className="w-full flex justify-center ">
      <div className="flex flex-col items-center w-full">
        <TooltipToast cmdRef={branchRef} durationMs={1000} sideOffset={0} />
        <GitBranchManager
          defaultBranch={info.defaultBranch}
          key={selectKey}
          currentGitRef={currentGitRef}
          setCurrentBranch={setCurrentBranch}
          refs={[...(remoteRefs ?? []), ...branches]}
          replaceGitBranch={renameGitBranch}
          addGitBranch={addGitBranch}
          mergeGitBranch={mergeGitBranch}
          deleteGitBranch={deleteGitBranch}
        />
      </div>
    </div>
  );
}

///------------

// type GitRefFormValue = z.infer<typeof gitRefSchema>;
type GitBranchFormValue = z.infer<typeof gitBranchSchema>;

const GitBranchInputModes = {
  ADD: "add",
  EDIT: "edit",
} as const;
type GitBranchInputModeType = (typeof GitBranchInputModes)[keyof typeof GitBranchInputModes];

function GitBranchInput({
  previous,
  mode = "add",
  setShow,
  onSubmit,
}: {
  mode: GitBranchInputModeType;
  previous: GitBranchFormValue;
  setShow: (visible: boolean) => void;
  onSubmit: (values: {
    previous: null | GitBranchFormValue;
    next: GitBranchFormValue;
    mode: GitBranchInputModeType;
  }) => void;
}) {
  const form = useForm<GitBranchFormValue>({
    resolver: zodResolver(gitBranchSchema),
    defaultValues: previous,
  });

  function handleFormSubmit(values: GitBranchFormValue) {
    onSubmit({ previous, next: values, mode });
    setShow(false);
    form.reset();
  }

  function handleCancel() {
    setShow(false);
    form.reset();
  }
  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex items-center w-full">
      <Input
        {...form.register("branch")}
        autoFocus
        tabIndex={0}
        onBlur={(_e) => {
          handleCancel();
        }}
        autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === "Escape") handleCancel();
        }}
        placeholder="branch"
        className="w-full !text-xs h-8 m-0"
      />
    </form>
  );
}
