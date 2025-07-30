import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipToast } from "@/components/ui/TooltipToast";
import { Repo } from "@/features/git-repo/GitRepo";
import { cn } from "@/lib/utils";
import { Ellipsis, GitBranchIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export function GitBranchManager({
  branches,
  addGitBranch,
  replaceGitBranch,
  deleteGitBranch,
}: {
  branches: string[];
  addGitBranch: (branch: GitBranchFormValue) => void;
  replaceGitBranch: (previous: GitBranchFormValue, next: GitBranchFormValue) => void;
  deleteGitBranch: (remoteName: string) => void;
}) {
  const [selectMode, setSelectMode] = useState<"select" | "delete">("select");
  const [selectValue, setSelectValue] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [inputMode, setInputMode] = useState<GitBranchInputModeType>(GitBranchInputModes.ADD);
  const [showInput, setShowInput] = useState(false);

  if (selectMode === "delete") {
    return (
      <BranchDelete
        branches={branches}
        cancel={() => setSelectMode("select")}
        onSelect={(name: string) => {
          if (name === selectValue) setSelectValue("");
          deleteGitBranch(name);
        }}
      />
    );
  }
  if (showInput) {
    return (
      <GitBranchInput
        mode={inputMode}
        setShow={setShowInput}
        previous={{ branch: selectValue }}
        onSubmit={({ previous, next, mode }) => {
          if (mode === "add") {
            addGitBranch(next);
          }
          if (mode === "edit") {
            replaceGitBranch(previous!, next);
          }
          setSelectValue(next.branch);
        }}
      />
    );
  } else {
    return (
      <BranchSelect branches={branches} value={selectValue} onSelect={setSelectValue}>
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
          <DropdownMenuItem onClick={() => setSelectMode("delete")}>
            <Trash2 /> Delete Branch
          </DropdownMenuItem>
          {Boolean(selectValue) ? (
            <DropdownMenuItem
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
    <DropdownMenuContent
      onCloseAutoFocus={(e) => {
        console.log("on close auto focus");
        e.preventDefault();
      }}
      align="end"
    >
      {children}
    </DropdownMenuContent>
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
        {branches.map((branch) => (
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

const RemoteSelectPlaceHolder = (
  <div className="flex justify-center items-center">
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
      <Select key={value} onValueChange={(value) => onSelect(value)} value={value}>
        <SelectTrigger className={cn(className, "w-full bg-background text-xs h-8")}>
          <SelectValue placeholder={RemoteSelectPlaceHolder} />
        </SelectTrigger>
        <SelectContent>
          <div className="bg-background border rounded stroke-1"></div>
          {branches.map((branch) => (
            <SelectItem key={branch} value={branch} className={"!text-xs"}>
              {branch}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {children}
    </div>
  );
}

export function BranchManagerSection({
  repo,
  branches,
  branchRef,
}: {
  repo: Repo;
  branches: string[];
  branchRef: React.RefObject<{ show: (text?: string) => void }>;
}) {
  if (!branches) return null;
  return (
    <div className="px-4 w-full flex justify-center ">
      <div className="flex flex-col items-center w-full">
        <TooltipToast cmdRef={branchRef} durationMs={1000} sideOffset={0} />
        <GitBranchManager
          branches={branches}
          replaceGitBranch={(remoteName, remote) => {
            void repo.replaceGitBranch(remoteName.branch, remote.branch);
            branchRef.current.show("branch replaced");
          }}
          addGitBranch={(remoteName) => {
            void repo.addGitBranch(remoteName.branch);
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
    console.log(values);
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
