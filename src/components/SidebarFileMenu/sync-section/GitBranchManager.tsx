import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipToast } from "@/components/ui/TooltipToast";
import { GitPlaybook, Repo } from "@/features/git-repo/GitRepo";
import { cn } from "@/lib/utils";
import { Ellipsis, GitBranchIcon, LockKeyhole, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const isLockedBranch = (branch: string) => {
  return ["master", "main"].includes(branch.toLowerCase());
};

export function GitBranchManager({
  branches,
  addGitBranch,
  setCurrentBranch,
  replaceGitBranch,
  deleteGitBranch,
  branch,
}: {
  branches: string[];
  addGitBranch: (baseBranch: string, branch: GitBranchFormValue) => void;
  replaceGitBranch: (previous: GitBranchFormValue, next: GitBranchFormValue) => void;
  setCurrentBranch: (branch: string) => void;
  deleteGitBranch: (remoteName: string) => void;
  branch: string;
}) {
  const [selectMode, setSelectMode] = useState<"select" | "delete">("select");
  // const [selectValue, setSelectValue] = useState<string>(defaultBranch);
  const [open, setOpen] = useState(false);
  const [inputMode, setInputMode] = useState<GitBranchInputModeType>(GitBranchInputModes.ADD);
  const [showInput, setShowInput] = useState(false);

  if (selectMode === "delete") {
    return (
      <BranchDelete
        branches={branches}
        cancel={() => setSelectMode("select")}
        onSelect={(name: string) => {
          deleteGitBranch(name);
        }}
      />
    );
  }
  /* edit or add branch */
  if (showInput) {
    return (
      <GitBranchInput
        mode={inputMode}
        setShow={setShowInput}
        previous={{ branch }}
        onSubmit={({ previous, next, mode }) => {
          if (mode === "add") {
            addGitBranch(branch, next);
          }
          if (mode === "edit") {
            replaceGitBranch(previous!, next);
          }
        }}
      />
    );
  } else {
    /* select branch */
    return (
      <BranchSelect
        branches={branches}
        value={branch}
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
          {branches.length > 1 && (
            <DropdownMenuItem disabled={isLockedBranch(branch)} onClick={() => setSelectMode("delete")}>
              <Trash2 /> Delete Branch
            </DropdownMenuItem>
          )}
          {Boolean(branch) ? (
            <DropdownMenuItem
              disabled={isLockedBranch(branch)}
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
              Edit Branch
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
      <Button variant="outline" className="h-8" size="sm">
        <Ellipsis />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">{children}</DropdownMenuContent>
  </DropdownMenu>
);
function BranchDelete({
  className,
  branches,
  cancel,
  onSelect,
}: {
  className?: string;
  branches: string[];
  cancel: () => void;
  onSelect: (branchName: string) => void;
}) {
  return (
    <Select
      defaultOpen={true}
      onValueChange={onSelect}
      onOpenChange={(open) => {
        if (!open) cancel();
      }}
    >
      <SelectTrigger className={cn(className, "w-full bg-background text-xs h-8")}>
        <SelectValue placeholder="Delete Branch" />
      </SelectTrigger>
      <SelectContent>
        {branches
          .filter((b) => !isLockedBranch(b))
          .map((branch) => (
            <SelectItem
              key={branch}
              value={branch}
              className={
                "!text-xs focus:bg-destructive focus:text-primary-foreground w-full flex items-center justify-between"
              }
            >
              {branch}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}

const BranchSelectPlaceHolder = (
  <div className="w-full truncate flex items-center">
    <GitBranchIcon className="p-1 mr-2 stroke-ring" />
    Branch
  </div>
);

function BranchSelect({
  className,
  children,
  branches,
  onSelect,
  value,
}: {
  className?: string;
  children?: React.ReactNode;
  branches: string[];
  onSelect: (value: string) => void;
  value: string;
}) {
  return (
    <div className="w-full flex items-center justify-between space-x-2">
      <div className="w-full ">
        <Select key={value} onValueChange={(v) => onSelect(v)} value={value}>
          {/* <SelectTrigger className={cn(className, "whitespace-normal truncate max-w-full bg-background text-xs h-8")}> */}

          <SelectTrigger
            className={cn(
              className,
              "grid grid-cols-[1fr,auto] whitespace-normal truncate w-full bg-background text-xs h-8"
            )}
          >
            <SelectValue className="w-full" placeholder={BranchSelectPlaceHolder} />
          </SelectTrigger>
          <SelectContent>
            {branches.map((branch) => (
              <SelectItem key={branch} value={branch} className={"!text-xs"}>
                <div className="flex gap-2 items-center justify-start ">
                  {isLockedBranch(branch) ? <LockKeyhole size={12} /> : <GitBranchIcon size={12} />}
                  {branch}
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

export function BranchManagerSection({
  repo,
  defaultBranch,
  playbook,
  branches,
  branchRef,
}: {
  repo: Repo;
  playbook: GitPlaybook;
  defaultBranch: string;
  branches: string[];
  branchRef: React.RefObject<{ show: (text?: string) => void }>;
}) {
  if (!branches) return null;
  return (
    <div className="px-4 w-full flex justify-center ">
      <div className="flex flex-col items-center w-full">
        <TooltipToast cmdRef={branchRef} durationMs={1000} sideOffset={0} />
        <GitBranchManager
          branch={defaultBranch || branches[0] || ""}
          setCurrentBranch={(branch) => playbook.switchBranch(branch)}
          branches={branches}
          replaceGitBranch={(remoteName, remote) => {
            void repo.replaceGitBranch(remoteName.branch, remote.branch);
            branchRef.current.show("branch replaced");
          }}
          addGitBranch={(baseBranch, remoteName) => {
            void repo.addGitBranch({ branchName: remoteName.branch, symbolicRef: baseBranch, checkout: true });
            branchRef.current.show("branch added");
          }}
          deleteGitBranch={(remoteName) => {
            void repo.deleteGitBranch(remoteName);
            branchRef.current.show("branch deleted");
          }}
        />
      </div>
    </div>
  );
}

///------------
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Input } from "@/components/ui/input";

export const gitBranchSchema = z.object({
  branch: z
    .string()
    .min(1, "Branch name is required")
    .max(100, "Branch name is too long")
    .regex(
      /^(?!\/|.*([/.]\.|\/\/|@\{|\\))[^\x00-\x1f\x7f ~^:?*[]+(?<!\.lock|\/|\.| )$/,
      "Invalid branch name: must not start/end with '/', contain spaces, or special characters"
    ),
});

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
        onKeyDown={(e) => {
          if (e.key === "Escape") handleCancel();
        }}
        placeholder="branch"
        className="w-full !text-xs h-8 m-0"
      />
    </form>
  );
}
