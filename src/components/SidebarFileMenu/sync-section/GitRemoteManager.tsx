import { GitRemoteDialog } from "@/components/SidebarFileMenu/sync-section/GitRemoteDialog";
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
import { useRef, useState } from "react";

export function GitRemoteManager({
  remotes,
  addGitRemote,
  deleteGitRemote,
}: {
  remotes: GitRemote[];
  addGitRemote: (remote: { name: string; url: string }) => void;
  deleteGitRemote: (remoteName: string) => void;
}) {
  const [mode, setMode] = useState<"select" | "delete">("select");
  const [value, setValue] = useState<string>("");
  const gitRemoteCmdRef = useRef({ open: () => {} });

  return mode === "delete" ? (
    <RemoteDelete
      remotes={remotes}
      cancel={() => setMode("select")}
      onSelect={(name: string) => {
        if (name === value) setValue("");
        deleteGitRemote(name);
      }}
    />
  ) : (
    <>
      <GitRemoteDialog
        onSubmit={(remote) => {
          addGitRemote(remote);
          setValue(remote.name);
        }}
        cmdRef={gitRemoteCmdRef}
      />
      <RemoteSelect remotes={remotes} value={value} onSelect={setValue}>
        <GitAddDeleteEditDropDown
          onAddSelect={() => {}}
          onDeleteSelect={() => setMode("delete")}
          onEditSelect={() => {}}
        />
      </RemoteSelect>
    </>
  );
}

// function GitRemoteAddDeleteDropDown({
//   addGitRemote,
// }: {
//   addGitRemote: (remote: { name: string; url: string }) => void;
// }) {
//   return (
//     <>
//       <GitRemoteDialog
//         onSubmit={(remote) => {
//           addGitRemote(remote);
//           setValue(remote.name);
//         }}
//       >
//         <Button variant="outline" className="h-8" size="sm">
//           <Plus />
//         </Button>
//       </GitRemoteDialog>
//       <Button variant="outline" className="h-8" size="sm" onClick={() => setMode("delete")}>
//         <Minus />
//       </Button>
//     </>
//   );
// }

const GitAddDeleteEditDropDown = ({
  onAddSelect,
  onDeleteSelect,
  onEditSelect,
}: {
  onAddSelect: () => void;
  onDeleteSelect: () => void;
  onEditSelect: () => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" className="h-8" size="sm">
        <Ellipsis />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={onAddSelect}>
        <Plus /> Add Remote
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onDeleteSelect}>
        <Trash2 /> Delete Remote
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onEditSelect}>
        <Pencil />
        Edit Remote
      </DropdownMenuItem>
    </DropdownMenuContent>
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
