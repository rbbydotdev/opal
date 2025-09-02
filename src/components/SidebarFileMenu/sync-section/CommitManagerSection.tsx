import { GitCommitManager } from "@/components/SidebarFileMenu/sync-section/GitCommitManager";
import { TooltipToast } from "@/components/ui/TooltipToast";
import { GitPlaybook } from "@/features/git-repo/GitPlaybook";
import { GitRefType, RepoCommit } from "@/features/git-repo/GitRepo";

export function CommitManagerSection({
  playbook,
  commits = [],
  currentCommit,
  commitRef,
  refType,
  hasChanges,
}: {
  playbook: GitPlaybook;
  commits: RepoCommit[];
  currentCommit?: string;
  commitRef: React.RefObject<{ show: (text?: string) => void }>;
  refType: GitRefType;
  hasChanges: boolean;
}) {
  if (!commits || commits.length === 0) return null;

  return (
    <>
      <div className="w-full flex justify-center ">
        <div className="flex flex-col items-center w-full">
          <TooltipToast cmdRef={commitRef} durationMs={1000} sideOffset={0} />
          <GitCommitManager
            refType={refType}
            commits={commits}
            resetHard={(commitOid) => playbook.resetHard({ ref: commitOid })}
            currentCommit={currentCommit}
            resetToHead={playbook.resetToHead}
            resetToOrigHead={playbook.resetToPrevBranch}
            setCurrentCommit={(commitOid) => playbook.switchCommit(commitOid)}
            hasChanges={hasChanges}
          />
        </div>
      </div>
    </>
  );
}
