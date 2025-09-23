import { GitRemoteDialog, useGitRemoteDialogCmd } from "@/components/SidebarFileMenu/sync-section/GitRemoteDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipToast } from "@/components/ui/TooltipToast";
import { GitRemote, GitRepo, RepoInfoType } from "@/features/git-repo/GitRepo";
import { cn } from "@/lib/utils";
import * as Comlink from "comlink";
import { Delete, Download, Ellipsis, Pencil, Plus, RefreshCw, SatelliteDishIcon, Upload } from "lucide-react";
import { useState } from "react";

export function GitRemoteManager({
  remotes,
  addGitRemote,
  replaceGitRemote,
  deleteGitRemote,
  setSelectRemote,
  selectRemote,
  pushRepo,
  pullRepo,
  fetchRepo,
  syncRepo,
}: {
  remotes: GitRemote[];
  addGitRemote: (remote: GitRemote) => void;
  replaceGitRemote: (previous: GitRemote, next: GitRemote) => void;
  deleteGitRemote: (remoteName: string) => void;
  setSelectRemote: (remote: string) => void;
  selectRemote: string | null;
  pushRepo: () => void;
  pullRepo: () => void;
  fetchRepo: () => void;
  syncRepo: () => void;
}) {
  const [selectMode, setSelectMode] = useState<"select" | "delete">("select");
  const [selectOpen, setSelectOpen] = useState(false);
  const cmdRef = useGitRemoteDialogCmd();

  return selectMode === "delete" ? (
    <RemoteDelete
      remotes={remotes}
      cancel={() => setSelectMode("select")}
      onSelect={(name: string) => {
        if (name === selectRemote) setSelectRemote("");
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
          setSelectRemote(next.name);
        }}
      />
      <RemoteSelect
        onOpenButEmpty={() => setSelectOpen(true)}
        remotes={remotes}
        value={selectRemote}
        onSelect={setSelectRemote}
      >
        <GitRemoteManagerDropDown open={selectOpen} setOpen={setSelectOpen}>
          <DropdownMenuItem onClick={() => cmdRef.current.open("add")}>
            <Plus /> Add Remote
          </DropdownMenuItem>
          {Boolean(remotes.length) && (
            <DropdownMenuItem onClick={() => setSelectMode("delete")}>
              <Delete className="text-destructive" /> Delete Remote
            </DropdownMenuItem>
          )}

          {Boolean(selectRemote) ? (
            <DropdownMenuItem
              onClick={() =>
                cmdRef.current.open("edit", {
                  ...((remotes.find((r) => r.name === selectRemote) || {}) as GitRemote),
                })
              }
            >
              <Pencil />
              Edit Remote
            </DropdownMenuItem>
          ) : null}
          {Boolean(selectRemote) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={syncRepo}>
                <RefreshCw /> Sync Now
              </DropdownMenuItem>
              <DropdownMenuItem onClick={pushRepo}>
                <Upload /> Push
              </DropdownMenuItem>
              <DropdownMenuItem onClick={pullRepo}>
                <Download /> Pull
              </DropdownMenuItem>
              <DropdownMenuItem onClick={fetchRepo}>
                <Download /> Fetch
              </DropdownMenuItem>
            </>
          )}
        </GitRemoteManagerDropDown>
      </RemoteSelect>
    </>
  );
}

const GitRemoteManagerDropDown = ({
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
      <Button variant="outline" className="h-8" size="sm" title="Remote Menu">
        <Ellipsis />
        <span className="sr-only">Remote Menu</span>
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
  selectRemote,
  setSelectRemote,
}: {
  repo: GitRepo | Comlink.Remote<GitRepo>;
  info: RepoInfoType;
  remoteRef: React.RefObject<{ show: (text?: string) => void }>;
  className?: string;
  selectRemote: string | null;
  setSelectRemote: (remote: string) => void;
}) {
  const handlePush = async () => {
    if (!selectRemote) return;
    try {
      await repo.push({ remote: selectRemote });
      remoteRef.current.show("push successful");
    } catch (e) {
      remoteRef.current.show("push failed");
      console.error(e);
    }
  };
  const handlePull = async () => {
    if (!selectRemote) return;
    try {
      await repo.pull({ remote: selectRemote });
      remoteRef.current.show("pull successful");
    } catch (e) {
      remoteRef.current.show("pull failed");
      console.error(e);
    }
  };
  const handleFetch = async () => {
    if (!selectRemote) return;
    try {
      const remoteObj = await repo.getRemote(selectRemote);
      if (!remoteObj) throw new Error("Remote not found");
      await repo.fetch({
        url: remoteObj.url,
        remote: remoteObj.name,
        corsProxy: remoteObj.gitCorsProxy,
        onAuth: remoteObj.onAuth,
      });
      remoteRef.current.show("fetch successful");
    } catch (e) {
      remoteRef.current.show("fetch failed");
      console.error(e);
    }
  };
  const handleSync = async () => {
    if (!selectRemote) return;
    try {
      // Sync = fetch + pull + push
      await handleFetch();
      await handlePull();
      await handlePush();
      remoteRef.current.show("sync successful");
    } catch (e) {
      remoteRef.current.show("sync failed");
      console.error(e);
    }
  };
  return (
    <div className={cn("w-full flex justify-center flex-col items-center", className)}>
      <>
        <TooltipToast cmdRef={remoteRef} durationMs={1000} sideOffset={0} />
        <GitRemoteManager
          remotes={info.remotes}
          pushRepo={handlePush}
          pullRepo={handlePull}
          fetchRepo={handleFetch}
          syncRepo={handleSync}
          selectRemote={selectRemote}
          setSelectRemote={setSelectRemote}
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
      </>
    </div>
  );
}
