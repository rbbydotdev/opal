import { GitRemoteDialog, useGitRemoteDialogCmd } from "@/components/SidebarFileMenu/sync-section/GitRemoteDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitRemote } from "@/features/git-repo/GitRepo";
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
      <RemoteSelect remotes={remotes} value={selectValue} onSelect={setSelectValue}>
        <GitAddDeleteEditDropDown>
          <DropdownMenuItem onClick={() => cmdRef.current.open("add")}>
            <Plus /> Add Remote
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSelectMode("delete")}>
            <Trash2 /> Delete Remote
          </DropdownMenuItem>
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

const GitAddDeleteEditDropDown = ({ children }: { children: React.ReactNode }) => (
  <DropdownMenu>
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
      <SelectTrigger className={cn(className, "w-full bg-background text-xs h-8")}>
        <SelectValue placeholder="Delete Remote" />
      </SelectTrigger>
      <SelectContent>
        {remotes.map((remote) => (
          <SelectItem
            key={remote.name}
            value={remote.name}
            className={
              "!text-xs focus:bg-destructive focus:text-primary-foreground w-full flex items-center justify-between"
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
  <div className="flex justify-center items-center">
    <SatelliteDishIcon className="p-1 mr-2 stroke-ring" />
    Remote
  </div>
);

function RemoteSelect({
  className,
  children,
  remotes,
  onSelect,
  value,
}: {
  className?: string;
  children?: React.ReactNode;
  remotes: GitRemote[];
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
          {remotes.map((remote) => (
            <SelectItem key={remote.name} value={remote.name} className={"!text-xs"}>
              {remote.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {children}
    </div>
  );
}
