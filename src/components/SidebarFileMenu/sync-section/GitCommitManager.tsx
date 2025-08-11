import { useConfirm } from "@/components/Confirm";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  commits: Array<{ oid: string; commit: { message: string; author: { name: string; timestamp: number } } }>;
  setCurrentCommit: (commitOid: string) => void;
  resetToHead: () => void;
  resetToOrigHead: () => void;
  refType: "branch" | "commit";
  currentCommit?: string;
}) {
  const { open: confirmOpen } = useConfirm();
  const resetToHeadHandler = () => {
    confirmOpen(
      resetToHead,
      "Reset to HEAD",
      "Are you sure you want to reset to HEAD? This will discard all changes made since the last commit."
    );
  };
  const resetToOrigHeadHandler = () => {
    confirmOpen(
      resetToOrigHead,
      "Reset to Previous Branch",
      "Are you sure you want to reset to the previous branch? This will discard all changes made since the last commit."
    );
  };
  /* select commit */
  const [open, setOpen] = useState(false);
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
