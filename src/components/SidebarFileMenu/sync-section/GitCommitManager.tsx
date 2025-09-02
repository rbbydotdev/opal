import { useConfirm } from "@/components/Confirm";
import { SelectHighlight } from "@/components/SidebarFileMenu/sync-section/SelectHighlight";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitRefType, RepoCommit } from "@/features/git-repo/GitRepo";
import { cn } from "@/lib/utils";
import { ArrowBigLeftDashIcon, Ellipsis, GitCommit, RotateCcw } from "lucide-react";
import { useState } from "react";
import { timeAgo } from "short-time-ago";

export function GitCommitManager({
  commits,
  setCurrentCommit,
  resetToHead,
  resetToOrigHead,
  refType,
  resetHard,
  currentCommit,
  hasChanges,
}: {
  commits: RepoCommit[];
  setCurrentCommit: (commitOid: string) => void;
  resetToHead: () => void;
  resetToOrigHead: () => void;
  resetHard: (commitOid: string) => void;
  refType: GitRefType;
  currentCommit?: string;
  hasChanges: boolean;
}) {
  const { open: confirmOpen } = useConfirm();
  const resetToHeadHandler = () => {
    if (!hasChanges) return resetToHead();
    void confirmOpen(
      resetToHead,
      "Reset to HEAD",
      "Are you sure you want to reset to HEAD? This will discard all changes made since the last commit."
    );
  };
  const resetToOrigHeadHandler = () => {
    if (!hasChanges) resetToOrigHead();
    void confirmOpen(
      resetToOrigHead,
      "Reset to Previous Branch",
      "Are you sure you want to reset to the previous branch? This will discard all changes made since the last commit."
    );
  };

  const handleResetHard = (commitOid: string) => {
    setSelectCommit(false);
    if (!hasChanges) return resetHard(commitOid);
    void confirmOpen(
      () => resetHard(commitOid),
      "Reset to Hard",
      <>
        Are you sure you want to reset to
        <i>
          <b>{commitOid.slice(0, 12)}</b>
        </i>
        ?<br />
        <i>
          <b>⚠️ THIS WILL DISCARD ALL CHANGES MADE SINCE THE LAST COMMIT</b>
        </i>
      </>
    );
  };

  // const reset

  const [open, setOpen] = useState(false);
  const [selectCommit, setSelectCommit] = useState(false);

  if (selectCommit) {
    return (
      <SelectHighlight
        items={commits.map((commit) => ({ value: commit.oid, label: <CommitLabel commitData={commit} /> }))}
        placeholder="Select Commit"
        itemClassName={cn("focus:!bg-ring focus:!text-primary-foreground [&_*]:focus:text-primary-foreground")}
        onSelect={(commit) => handleResetHard(commit)}
        onCancel={() => setSelectCommit(false)}
      />
    );
  }

  return (
    <>
      <CommitSelect
        commits={commits}
        value={currentCommit || commits[0]?.oid || ""}
        onSelect={(value: string) => {
          setCurrentCommit(value);
        }}
      >
        <GitCommitMenuDropDown open={open} setOpen={setOpen}>
          <DropdownMenuItem onClick={resetToHeadHandler} onSelect={resetToHeadHandler}>
            <RotateCcw />
            Reset to HEAD
          </DropdownMenuItem>
          <DropdownMenuItem onClick={resetToOrigHeadHandler} onSelect={resetToOrigHeadHandler}>
            <RotateCcw />
            Reset to Previous Branch
          </DropdownMenuItem>
          {refType === "branch" && (
            <DropdownMenuItem onClick={() => setSelectCommit(true)} onSelect={() => setSelectCommit(true)}>
              <ArrowBigLeftDashIcon className="text-ring" />
              <span>
                Reset <b>hard</b>
              </span>
            </DropdownMenuItem>
          )}
        </GitCommitMenuDropDown>
      </CommitSelect>
    </>
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
  <div className="w-full truncate flex items-center gap-2">
    <GitCommit size={12} className="flex-shrink-0" />
    <span className="truncate">Select Commit</span>
  </div>
);

function CompactCommitLabel({ commitData }: { commitData: RepoCommit }) {
  const timestamp = new Date(commitData.commit.author.timestamp * 1000);
  return (
    <div className="flex items-center gap-2 " title={`${timestamp} - ${commitData.commit.message}`}>
      <GitCommit size={12} className="flex-shrink-0" />
      <span className="uppercase border rounded-full size-5 text-2xs flex-shrink-0 flex justify-center items-center bg-sidebar-background">
        {commitData.commit.author.name
          .split(" ")
          .slice(0, 2)
          .map((n) => n[0])
          .join("")}
      </span>

      <span className="text-2xs whitespace-nowrap ">{timeAgo(timestamp)}</span>
      <span className="font-mono text-muted-foreground">{formatCommitHash(commitData.oid)}</span>
      <span className="truncate">{formatCommitMessage(commitData.commit.message)}</span>
    </div>
  );
}

function CommitSelect({
  className,
  children,
  commits,
  onSelect,
  value,
}: {
  className?: string;
  children?: React.ReactNode;
  commits: RepoCommit[];
  onSelect: (value: string) => void;
  value: string;
}) {
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
            <SelectValue className="w-full" placeholder={CommitSelectPlaceHolder}>
              {value && commits.find((c) => c.oid === value) ? (
                <CompactCommitLabel commitData={commits.find((c) => c.oid === value)!} />
              ) : (
                CommitSelectPlaceHolder
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="_min-w-max max-h-96 min-w-72 max-w-96 truncate">
            <div className="grid truncate">
              {commits.flat().map((commitData) => (
                <SelectItem key={commitData.oid} value={commitData.oid} className={"!text-xs"}>
                  <CommitLabel commitData={commitData} />
                </SelectItem>
              ))}
            </div>
          </SelectContent>
        </Select>
      </div>
      <div>{children}</div>
    </div>
  );
}

const formatCommitMessage = (message: string, maxLength = 40) => {
  const firstLine = message.split("\n")[0] || "";
  return firstLine.length > maxLength ? firstLine!.substring(0, maxLength) + "..." : firstLine;
};

const formatCommitHash = (oid: string) => {
  return oid.substring(0, 7);
};

function CommitLabel({ commitData }: { commitData: RepoCommit }) {
  const timestamp = new Date(commitData.commit.author.timestamp * 1000);
  // const timezoneOffset = commitData.commit.author.timezoneOffset;
  return (
    <div
      className="grid grid-cols-[auto_1rem_5rem_4rem_1fr] gap-1 items-center min-w-0"
      title={`${timestamp} - ${commitData.commit.message}`}
    >
      <GitCommit size={12} className="flex-shrink-0" />

      <span className="uppercase border rounded-full size-5 text-2xs flex-shrink-0 flex justify-center items-center bg-sidebar-background">
        {commitData.commit.author.name
          .split(" ")
          .slice(0, 2)
          .map((n) => n[0])
          .join("")}
      </span>
      <span className="pl-1 text-2xs whitespace-nowrap truncate">{timeAgo(timestamp)}</span>
      <span className="font-mono text-muted-foreground">{formatCommitHash(commitData.oid)}</span>
      <span className="truncate min-w-0">{formatCommitMessage(commitData.commit.message)}</span>
    </div>
  );
}
