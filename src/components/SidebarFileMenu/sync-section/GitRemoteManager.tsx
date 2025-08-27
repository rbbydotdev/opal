import { GitRemoteDialog, useGitRemoteDialogCmd } from "@/components/SidebarFileMenu/sync-section/GitRemoteDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipToast } from "@/components/ui/TooltipToast";
import { GitRemote, GitRepo, RepoInfoType } from "@/features/git-repo/GitRepo";
import { cn } from "@/lib/utils";
import * as Comlink from "comlink";
import { Ellipsis, Pencil, Plus, SatelliteDishIcon, Trash2 } from "lucide-react";
import { useState } from "react";

export function GitRemoteManager({
  remotes,
  addGitRemote,
  replaceGitRemote,
  deleteGitRemote,
}: {
  remotes: GitRemote[];
  addGitRemote: (remote: GitRemote) => void;
  replaceGitRemote: (previous: GitRemote, next: GitRemote) => void;
  deleteGitRemote: (remoteName: string) => void;
}) {
  const defaultRemote = remotes.find((r) => r.name === "origin") || remotes[0];
  const [selectMode, setSelectMode] = useState<"select" | "delete">("select");
  const [selectValue, setSelectValue] = useState<string | null>(defaultRemote?.name ?? null);
  const [selectOpen, setSelectOpen] = useState(false);
  const cmdRef = useGitRemoteDialogCmd();
  const finalSelectValue = selectValue || defaultRemote?.name || remotes[0]?.name || null;

  return selectMode === "delete" ? (
    <RemoteDelete
      remotes={remotes}
      cancel={() => setSelectMode("select")}
      onSelect={(name: string) => {
        if (name === finalSelectValue) setSelectValue("");
        deleteGitRemote(name);
      }}
    />
  ) : (
    <>
      <GitRemoteDialog
        cmdRef={cmdRef}
        onSubmit={({ previous, next, mode }) => {
          if (mode === "add") {
            addGitRemote(next);
          }
          if (mode === "edit") {
            replaceGitRemote(previous!, next);
          }
          setSelectValue(next.name);
        }}
      />
      <RemoteSelect
        onOpenButEmpty={() => setSelectOpen(true)}
        remotes={remotes}
        value={finalSelectValue}
        onSelect={setSelectValue}
      >
        <GitAddDeleteEditDropDown open={selectOpen} setOpen={setSelectOpen}>
          <DropdownMenuItem onClick={() => cmdRef.current.open("add")}>
            <Plus /> Add Remote
          </DropdownMenuItem>
          {Boolean(remotes.length) && (
            <DropdownMenuItem onClick={() => setSelectMode("delete")}>
              <Trash2 /> Delete Remote
            </DropdownMenuItem>
          )}
          {Boolean(finalSelectValue) ? (
            <DropdownMenuItem
              onClick={() =>
                cmdRef.current.open("edit", {
                  ...((remotes.find((r) => r.name === finalSelectValue) || {}) as GitRemote),
                })
              }
            >
              <Pencil />
              Edit Remote
            </DropdownMenuItem>
          ) : null}
        </GitAddDeleteEditDropDown>
      </RemoteSelect>
    </>
  );
}

const GitAddDeleteEditDropDown = ({
  children,
  open,
  setOpen,
}: {
  children: React.ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
}) => (
  <DropdownMenu open={open} onOpenChange={setOpen}>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" className="h-8" size="sm">
        <Ellipsis />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">{children}</DropdownMenuContent>
  </DropdownMenu>
);
function RemoteDelete({
  className,
  remotes,
  cancel,
  onSelect,
}: {
  className?: string;
  remotes: GitRemote[];
  cancel: () => void;
  onSelect: (remoteName: string) => void;
}) {
  return (
    <Select
      defaultOpen={true}
      onValueChange={onSelect}
      onOpenChange={(open) => {
        if (!open) cancel();
      }}
    >
      <SelectTrigger className={cn(className, "whitespace-normal truncate max-w-full bg-background text-xs h-8")}>
        <SelectValue placeholder="Delete Remote" />
      </SelectTrigger>
      <SelectContent>
        {remotes.map((remote) => (
          <SelectItem
            key={remote.name}
            value={remote.name}
            className={
              "!text-xs focus:bg-destructive focus:text-primary-foreground max-w-full flex items-center justify-between"
            }
          >
            {remote.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const RemoteSelectPlaceHolder = (
  <div className="w-full truncate flex items-center">
    <div className="p-1 mr-1">
      <SatelliteDishIcon className="w-4 h-4 stroke-ring flex-shrink-0" />
    </div>
    Remote
  </div>
);

const NoRemoteSelectPlaceHolder = (
  <div className="w-full truncate flex items-center">
    <div className="p-1 mr-1">
      <SatelliteDishIcon className="w-4 h-4 stroke-ring flex-shrink-0" />
    </div>
    Add Remote
  </div>
);

function RemoteSelect({
  className,
  children,
  remotes,
  onSelect,
  value,
  onOpenButEmpty,
}: {
  className?: string;
  children?: React.ReactNode;
  remotes: GitRemote[];
  onSelect: (value: string) => void;
  value: string | null;
  onOpenButEmpty?: () => void; // Optional callback when opening select with no remotes
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full flex items-center justify-between space-x-2 ">
      <div className="w-full">
        <Select
          open={open}
          onOpenChange={(o) => {
            if (!remotes.length) return onOpenButEmpty?.();
            setOpen(o);
          }}
          key={value}
          onValueChange={(value) => onSelect(value)}
          value={value ?? undefined}
        >
          <SelectTrigger
            title="select remote"
            className={cn(
              className,
              "grid grid-cols-[1fr,auto] whitespace-normal truncate w-full bg-background text-xs h-8"
            )}
          >
            <SelectValue
              className="w-full"
              placeholder={remotes.length ? RemoteSelectPlaceHolder : NoRemoteSelectPlaceHolder}
            />
          </SelectTrigger>
          <SelectContent>
            {remotes.map((remote) => (
              <SelectItem key={remote.name} value={remote.name} className={"!text-xs truncate"}>
                <div className="flex gap-2 items-center justify-start truncate">
                  <SatelliteDishIcon size={16} className="stroke-ring flex-shrink-0 w-4 h-4" />
                  <span className="truncate">{remote.name}</span>
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

export function RemoteManagerSection({
  repo,
  info,
  remoteRef,
  className,
}: {
  repo: GitRepo | Comlink.Remote<GitRepo>;
  info: RepoInfoType; //{ latestCommit: RepoLatestCommit; remotes: GitRemote[] };
  remoteRef: React.RefObject<{ show: (text?: string) => void }>;
  className?: string;
}) {
  return (
    <div className={cn("px-4 w-full flex justify-center flex-col items-center", className)}>
      <TooltipToast cmdRef={remoteRef} durationMs={1000} sideOffset={0} />
      <GitRemoteManager
        remotes={info.remotes}
        replaceGitRemote={(previousRemote, nextRemote) => {
          void repo.replaceGitRemote(previousRemote, nextRemote);
          remoteRef.current.show("remote replaced");
        }}
        addGitRemote={(remote) => {
          void repo.addGitRemote(remote);
          remoteRef.current.show("remote added");
        }}
        deleteGitRemote={(remote) => {
          void repo.deleteGitRemote(remote);
          remoteRef.current.show("remote deleted");
        }}
      />
    </div>
  );
}
