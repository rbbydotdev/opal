import { useConfirm } from "@/components/Confirm";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RepoCommit } from "@/features/git-repo/GitRepo";
import { cn } from "@/lib/utils";
import { Ellipsis, GitCommit, RotateCcw } from "lucide-react";
import { useState } from "react";

export function GitCommitManager({
  commits,
  setCurrentCommit,
  resetToHead,
  resetToOrigHead,
  refType: _refType,
  currentCommit,
}: {
  commits: RepoCommit[];
  setCurrentCommit: (commitOid: string) => void;
  resetToHead: () => void;
  resetToOrigHead: () => void;
  refType: "branch" | "commit";
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

  const resetHardToCommit = () => {};

  /* select commit */
  const [open, setOpen] = useState(false);

  // return (
  //   <SelectHighlight
  //     items={commits.map((commit) => ({ value: commit.oid, label: <CommitLabel commitData={commit} /> }))}
  //     placeholder="Select Commit"
  //     onSelect={() => {}}
  //     onCancel={() => {}}
  //   ></SelectHighlight>
  // );

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
    <div className="w-full truncate flex items-center">
      <GitCommit className="p-1 mr-2 stroke-ring" />
      <div className="flex flex-col">
        <span className="text-xs font-mono">{formatCommitHash(commitData.oid)}</span>
        <span className="text-xs">{formatCommitMessage(commitData.commit.message)}</span>
      </div>
    </div>
  );
}
