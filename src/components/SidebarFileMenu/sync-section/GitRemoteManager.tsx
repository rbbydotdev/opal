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
import { GitRemote, Repo, RepoLatestCommit } from "@/features/git-repo/GitRepo";
import { cn } from "@/lib/utils";
import { Ellipsis, Pencil, Plus, SatelliteDishIcon, Trash2 } from "lucide-react";
import { useState } from "react";

export function GitRemoteManager({
  remotes,
  addGitRemote,
  replaceGitRemote,
  deleteGitRemote,
}: {
  remotes: GitRemote[];
  addGitRemote: (remote: { name: string; url: string }) => void;
  replaceGitRemote: (previous: GitRemote, next: GitRemote) => void;
  deleteGitRemote: (remoteName: string) => void;
}) {
  const [selectMode, setSelectMode] = useState<"select" | "delete">("select");
  const [selectValue, setSelectValue] = useState<string>("");
  const [selectOpen, setSelectOpen] = useState(false);
  const cmdRef = useGitRemoteDialogCmd();

  return selectMode === "delete" ? (
    <RemoteDelete
      remotes={remotes}
      cancel={() => setSelectMode("select")}
      onSelect={(name: string) => {
        if (name === selectValue) setSelectValue("");
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
        value={selectValue}
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
          {Boolean(selectValue) ? (
            <DropdownMenuItem
              onClick={() =>
                cmdRef.current.open(
                  "edit",
                  remotes.find((r) => r.name === selectValue)
                )
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
  <div className="flex justify-center items-center max-w-full truncate">
    <SatelliteDishIcon className="p-1 mr-2 stroke-ring" />
    Remote
  </div>
);

const NoRemoteSelectPlaceHolder = (
  <div className="flex justify-center items-center">
    <SatelliteDishIcon className="p-1 mr-2 stroke-ring" />
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
  value: string;
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
          value={value}
        >
          <SelectTrigger className={cn(className, "whitespace-normal truncate max-w-full bg-background text-xs h-8")}>
            <SelectValue placeholder={remotes.length ? RemoteSelectPlaceHolder : NoRemoteSelectPlaceHolder} />
          </SelectTrigger>
          <SelectContent>
            <div className="bg-background border rounded stroke-1"></div>
            {remotes.map((remote) => (
              <SelectItem key={remote.name} value={remote.name} className={"!text-xs"}>
                {remote.name}
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
}: {
  repo: Repo;
  info: { latestCommit: RepoLatestCommit; remotes: GitRemote[] };
  remoteRef: React.RefObject<{ show: (text?: string) => void }>;
}) {
  return (
    <div className="px-4 w-full flex justify-center ">
      <div className="flex flex-col items-center w-full">
        <TooltipToast cmdRef={remoteRef} durationMs={1000} sideOffset={0} />
        <GitRemoteManager
          remotes={info.remotes}
          replaceGitRemote={(remoteName, remote) => {
            void repo.replaceGitRemote(remoteName, remote);
            remoteRef.current.show("remote replaced");
          }}
          addGitRemote={(remoteName) => {
            void repo.addGitRemote(remoteName);
            remoteRef.current.show("remote added");
          }}
          deleteGitRemote={(remoteName) => {
            void repo.deleteGitRemote(remoteName);
            remoteRef.current.show("remote deleted");
          }}
        />
      </div>
    </div>
  );
}
