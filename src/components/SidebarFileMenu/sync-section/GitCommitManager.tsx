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

export function GitCommitManager({
  commits,
  setCurrentCommit,
  resetToHead,
  resetToOrigHead,
  refType,
  resetHard,
  currentCommit,
}: {
  commits: RepoCommit[];
  setCurrentCommit: (commitOid: string) => void;
  resetToHead: () => void;
  resetToOrigHead: () => void;
  resetHard: (commitOid: string) => void;
  refType: GitRefType;
  currentCommit?: string;
}) {
  const { open: confirmOpen } = useConfirm();
  const resetToHeadHandler = () => {
    void confirmOpen(
      resetToHead,
      "Reset to HEAD",
      "Are you sure you want to reset to HEAD? This will discard all changes made since the last commit."
    );
  };
  const resetToOrigHeadHandler = () => {
    void confirmOpen(
      resetToOrigHead,
      "Reset to Previous Branch",
      "Are you sure you want to reset to the previous branch? This will discard all changes made since the last commit."
    );
  };

  const handleResetHard = (commitOid: string) => {
    setSelectCommit(false);
    void confirmOpen(
      () => resetHard(commitOid),
      "Reset to Hard",
      `Are you sure you want to reset to <i><b>${commitOid.slice(0, 12)}</b></i>?<br/><i><b>⚠️ THIS WILL DISCARD ALL CHANGES MADE SINCE THE LAST COMMIT</b></i>`
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
        // onSelect={(branch) => resetHard(branch)}
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
            <SelectValue className="w-full" placeholder={CommitSelectPlaceHolder} />
          </SelectTrigger>
          <SelectContent>
            {commits.map((commitData) => (
              <SelectItem key={commitData.oid} value={commitData.oid} className={"!text-xs"}>
                <CommitLabel commitData={commitData} />
              </SelectItem>
            ))}
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
  return (
    <>
      <div className="flex gap-2 items-center justify-start">
        <GitCommit size={12} className="flex-shrink-0" />
        <span className="font-mono text-muted-foreground">{formatCommitHash(commitData.oid)}</span>
        <span className="truncate">{formatCommitMessage(commitData.commit.message)}</span>
      </div>
    </>
  );
}
