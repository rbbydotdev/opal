import { GitCommitManager } from "@/components/SidebarFileMenu/sync-section/GitCommitManager";
import { TooltipToast } from "@/components/ui/TooltipToast";
import { GitPlaybook } from "@/features/git-repo/GitRepo";

export function CommitManagerSection({
  playbook,
  commits = [],
  currentCommit,
  commitRef,
  refType,
}: {
  playbook: GitPlaybook;
  commits?: Array<{ oid: string; commit: { message: string; author: { name: string; timestamp: number } } }>;
  currentCommit?: string;
  commitRef: React.RefObject<{ show: (text?: string) => void }>;
  refType: "branch" | "commit";
}) {
  if (!commits || commits.length === 0) return null;

  return (
    <>
      <div className="px-4 w-full flex justify-center ">
        <div className="flex flex-col items-center w-full">
          <TooltipToast cmdRef={commitRef} durationMs={1000} sideOffset={0} />
          <GitCommitManager
            refType={refType}
            commits={commits}
            currentCommit={currentCommit}
            resetToHead={playbook.resetToHead}
            resetToOrigHead={playbook.resetToPrevBranch}
            setCurrentCommit={(commitOid) => playbook.switchCommit(commitOid)}
          />
        </div>
      </div>
    </>
  );
}
