import { OPAL_AUTHOR } from "@/app/GitConfig";
import { OpalSvg } from "@/components/OpalSvg";
import { SelectHighlight } from "@/components/sidebar/sync-section/SelectHighlight";
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
  resetSoft,
  currentCommit,
  hasParent,
  // hasChanges,
}: {
  commits: RepoCommit[];
  setCurrentCommit: (commitOid: string) => void;
  resetToHead: () => void;
  resetSoft: () => void;
  resetToOrigHead: () => void;
  resetHard: (commitOid: string) => void;
  refType: GitRefType;
  currentCommit?: string;
  // hasChanges: boolean;
  hasParent?: boolean;
}) {
  // const reset

  const [open, setOpen] = useState(false);
  const [selectCommit, setSelectCommit] = useState(false);

  if (selectCommit) {
    return (
      <SelectHighlight
        items={commits.map((commit) => ({ value: commit.oid, label: <CommitLabel commitData={commit} /> }))}
        placeholder="Select Commit"
        itemClassName={cn("focus:!bg-ring focus:!text-primary-foreground [&_*]:focus:text-primary-foreground")}
        // onSelect={resetHardHandler}
        onSelect={(value) => {
          setSelectCommit(false);
          resetHard(value);
        }}
        onCancel={() => setSelectCommit(false)}
      />
    );
  }

  return (
    <>
      <CommitSelect commits={commits} value={currentCommit || commits[0]?.oid || ""} onSelect={setCurrentCommit}>
        <GitCommitMenuDropDown open={open} setOpen={setOpen}>
          <DropdownMenuItem onSelect={resetToHead}>
            <RotateCcw />
            Reset to HEAD
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={resetToOrigHead}>
            <RotateCcw />
            Reset to Previous Branch
          </DropdownMenuItem>
          {hasParent && (
            <DropdownMenuItem onSelect={resetSoft}>
              <RotateCcw />
              Reset Soft HEAD~1
            </DropdownMenuItem>
          )}
          {refType === "branch" && (
            <>
              <DropdownMenuItem onSelect={() => setSelectCommit(true)}>
                <ArrowBigLeftDashIcon className="text-ring" />
                <span>
                  Reset <b>hard</b>
                </span>
              </DropdownMenuItem>
            </>
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
      <Button variant="outline" className="h-8" size="sm" title="Commit Menu">
        <Ellipsis /> <span className="sr-only">Commit Menu</span>
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
const OpalAvatar = () => <OpalSvg />;
function CommitAvatar({ author }: { author: RepoCommit["commit"]["author"] }) {
  if (author.email === OPAL_AUTHOR.email) {
    return (
      <span className="w-5 h-5 flex-shrink-0 flex justify-center items-center rounded-full overflow-clip ">
        <OpalAvatar />
      </span>
    );
  } else {
    return (
      <span className="uppercase border rounded-full w-5 h-5 text-2xs flex-shrink-0 flex justify-center items-center bg-sidebar-background">
        {author.name
          .split(" ")
          .slice(0, 2)
          .map((n) => n[0])
          .join("")}
      </span>
    );
  }
}

function CompactCommitLabel({ commitData }: { commitData: RepoCommit }) {
  const timestamp = new Date(commitData.commit.author.timestamp * 1000);
  return (
    <div className="flex items-center gap-2 truncate min-w-0" title={`${timestamp} - ${commitData.commit.message}`}>
      <GitCommit size={12} className="flex-shrink-0 w-4 h-4" />
      <CommitAvatar author={commitData.commit.author} />

      <span className="text-2xs whitespace-nowrap ">{timeAgo(timestamp)}</span>
      <span className="font-mono text-muted-foreground truncate min-w-0">{formatCommitHash(commitData.oid)}</span>
      <span className="truncate min-w-0">{formatCommitMessage(commitData.commit.message)}</span>
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
            title="Select Commit"
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
          <SelectContent className="max-h-96 min-w-72 truncate">
            <div className="truncate">
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
  return (
    <div className="flex gap-2 items-center min-w-0" title={`${timestamp} - ${commitData.commit.message}`}>
      <GitCommit size={12} className="flex-shrink-0" />
      <CommitAvatar author={commitData.commit.author} />
      <span className="pl-1 text-2xs whitespace-nowrap truncate">{timeAgo(timestamp)}</span>
      <span className="font-mono text-muted-foreground">{formatCommitHash(commitData.oid)}</span>
      <span className="truncate min-w-0">{formatCommitMessage(commitData.commit.message)}</span>
    </div>
  );
}
