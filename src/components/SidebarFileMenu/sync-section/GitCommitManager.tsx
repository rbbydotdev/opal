import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipToast } from "@/components/ui/TooltipToast";
import { GitPlaybook } from "@/features/git-repo/GitRepo";
import { cn } from "@/lib/utils";
import { Ellipsis, GitCommit, RotateCcw } from "lucide-react";
import { useState } from "react";

export function GitCommitManager({
  commits,
  setCurrentCommit,
  resetToHead,
  resetToOrigHead,
  currentCommit,
}: {
  commits: Array<{ oid: string; commit: { message: string; author: { name: string; timestamp: number } } }>;
  setCurrentCommit: (commitOid: string) => void;
  resetToHead: () => void;
  resetToOrigHead: () => void;
  currentCommit?: string;
}) {
  const [open, setOpen] = useState(false);

  /* select commit */
  return (
    <CommitSelect
      commits={commits}
      value={currentCommit || commits[0]?.oid || ""}
      onSelect={(value: string) => {
        setCurrentCommit(value);
      }}
    >
      <GitCommitMenuDropDown open={open} setOpen={setOpen}>
        <DropdownMenuItem onClick={resetToHead} onSelect={resetToHead}>
          <RotateCcw />
          Reset to HEAD
        </DropdownMenuItem>
        <DropdownMenuItem onClick={resetToOrigHead} onSelect={resetToOrigHead}>
          <RotateCcw />
          Reset to Previous Branch
        </DropdownMenuItem>
      </GitCommitMenuDropDown>
    </CommitSelect>
  );
}

const GitCommitMenuDropDown = ({
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

const CommitSelectPlaceHolder = (
  <div className="w-full truncate flex items-center">
    <GitCommit className="p-1 mr-2 stroke-ring" />
    Commit
  </div>
);

function CommitSelect({
  className,
  children,
  commits,
  onSelect,
  value,
}: {
  className?: string;
  children?: React.ReactNode;
  commits: Array<{ oid: string; commit: { message: string; author: { name: string; timestamp: number } } }>;
  onSelect: (value: string) => void;
  value: string;
}) {
  const formatCommitMessage = (message: string, maxLength = 40) => {
    const firstLine = message.split("\n")[0] || "";
    return firstLine.length > maxLength ? firstLine!.substring(0, maxLength) + "..." : firstLine;
  };

  const formatCommitHash = (oid: string) => {
    return oid.substring(0, 7);
  };

  return (
    <div className="w-full flex items-center justify-between space-x-2">
      <div className="w-full ">
        <Select key={value} onValueChange={(v) => onSelect(v)} value={value}>
          <SelectTrigger
            title="select commit"
            className={cn(
              className,
              "grid grid-cols-[1fr,auto] whitespace-normal truncate w-full bg-background text-xs h-8"
            )}
          >
            <SelectValue className="w-full" placeholder={CommitSelectPlaceHolder} />
          </SelectTrigger>
          <SelectContent>
            {commits.map((commitData) => (
              <SelectItem key={commitData.oid} value={commitData.oid} className={"!text-xs"}>
                <div className="flex gap-2 items-center justify-start">
                  <GitCommit size={12} className="flex-shrink-0" />
                  <span className="font-mono text-muted-foreground">{formatCommitHash(commitData.oid)}</span>
                  <span className="truncate">{formatCommitMessage(commitData.commit.message)}</span>
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

export function CommitManagerSection({
  playbook,
  commits = [],
  currentCommit,
  commitRef,
}: {
  playbook: GitPlaybook;
  commits?: Array<{ oid: string; commit: { message: string; author: { name: string; timestamp: number } } }>;
  currentCommit?: string;
  commitRef: React.RefObject<{ show: (text?: string) => void }>;
}) {
  if (!commits || commits.length === 0) return null;

  return (
    <div className="px-4 w-full flex justify-center ">
      <div className="flex flex-col items-center w-full">
        <TooltipToast cmdRef={commitRef} durationMs={1000} sideOffset={0} />
        <GitCommitManager
          commits={commits}
          currentCommit={currentCommit}
          resetToHead={playbook.resetToHead}
          resetToOrigHead={playbook.resetToPrevBranch}
          setCurrentCommit={async (commitOid) => {
            await playbook.switchCommit(commitOid);
            //  commitRef.current?.show("switched to commit");
          }}
        />
      </div>
    </div>
  );
}
