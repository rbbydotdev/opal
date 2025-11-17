import { useConfirm } from "@/components/Confirm";
import { GitCommitManager } from "@/components/SidebarFileMenu/sync-section/GitCommitManager";
import { TooltipToast } from "@/components/ui/TooltipToast";
import { GitPlaybook } from "@/features/git-repo/GitPlaybook";
import { GitRefType, RepoCommit } from "@/features/git-repo/GitRepo";
import { useErrorToss } from "@/lib/errorToss";

export function CommitManagerSection({
  playbook,
  commits = [],
  currentCommit,
  commitRef,
  refType,
  hasChanges,
  hasParent,
}: {
  playbook: GitPlaybook;
  commits: RepoCommit[];
  currentCommit?: string;
  commitRef: React.RefObject<{ show: (text?: string) => void }>;
  refType: GitRefType;
  hasChanges: boolean;
  hasParent?: boolean;
}) {
  if (!commits || commits.length === 0) return null;

  const toss = useErrorToss();

  const { open: confirmOpen } = useConfirm();

  const resetSoftHandler = () => {
    void confirmOpen(
      () => playbook.resetSoftParent().catch(toss),
      "Reset Soft HEAD~1",
      "Are you sure you want to reset soft to HEAD~1? This will keep your changes staged."
    );
  };
  const resetToHeadHandler = () => {
    if (!hasChanges) return playbook.resetToHead().catch(toss);
    void confirmOpen(
      () => playbook.resetToHead().catch(toss),
      "Reset to HEAD",
      "Are you sure you want to reset to HEAD? This will discard all changes made since the last commit."
    );
  };
  const resetToOrigHeadHandler = () => {
    if (!hasChanges) return playbook.resetToPrevBranch().catch(toss);
    void confirmOpen(
      () => playbook.resetToPrevBranch().catch(toss),
      "Reset to Previous Branch",
      "Are you sure you want to reset to the previous branch? This will discard all changes made since the last commit."
    );
  };

  const switchCommitHandler = (commitOid: string) => {
    const switchCommit = () => playbook.switchCommit(commitOid).catch(toss);
    if (hasChanges) {
      void confirmOpen(
        switchCommit,
        "Switch Commit",
        "Are you sure you want to switch commits? This will discard all changes made since the last commit."
      );
    } else {
      void switchCommit();
    }
  };

  const resetHardHandler = (commitOid: string) => {
    void confirmOpen(
      () => playbook.resetHard({ ref: commitOid }),
      "Reset to Hard",
      <>
        Are you sure you want to reset to
        <i>
          <b> {commitOid.slice(0, 12)}</b>
        </i>
        ?<br />
        <i>
          <b>⚠️ THIS WILL DISCARD ALL CHANGES MADE SINCE THE LAST COMMIT</b>
        </i>
      </>
    );
  };

  return (
    <>
      <div className="w-full flex justify-center ">
        <div className="flex flex-col items-center w-full">
          <TooltipToast cmdRef={commitRef} durationMs={1000} sideOffset={0} />
          <GitCommitManager
            refType={refType}
            commits={commits}
            hasParent={hasParent}
            resetSoft={resetSoftHandler}
            resetHard={resetHardHandler}
            currentCommit={currentCommit}
            resetToHead={resetToHeadHandler}
            resetToOrigHead={resetToOrigHeadHandler}
            setCurrentCommit={switchCommitHandler}
          />
        </div>
      </div>
    </>
  );
}
