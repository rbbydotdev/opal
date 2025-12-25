import { BuildDAO } from "@/data/dao/BuildDAO";
import { BuildStrategy } from "@/data/dao/BuildRecord";
import { useRunner } from "@/hooks/useRunner";
import { BuildRunner, NULL_BUILD_RUNNER } from "@/services/build/BuildRunner";
import { Workspace } from "@/workspace/Workspace";
import { RunnerLogLine } from "@/types/RunnerTypes";
import { useCallback, useState } from "react";

type RunBuildResult =
  | { status: "success"; build: BuildDAO }
  | { status: "failed"; build: null }
  | { status: "cancelled"; build: null }
  | { status: "unknown"; build: null };

export function useBuildRunner(currentWorkspace: Workspace) {
  const [currentRunner, setCurrentRunner] = useState<BuildRunner | null>(null);

  const buildRunner = useRunner(() => currentRunner || NULL_BUILD_RUNNER, [currentRunner]) as BuildRunner;

  const openNew = useCallback(
    (strategy: BuildStrategy) => {
      const runner = BuildRunner.Create({
        workspace: currentWorkspace,
        label: `Build ${new Date().toLocaleString()}`,
        strategy,
      });
      setCurrentRunner(runner);
      return runner.build;
    },
    [currentWorkspace]
  );

  const openEdit = useCallback(
    async (buildId: string) => {
      const runner = await BuildRunner.Recall({
        buildId,
        workspace: currentWorkspace,
      });
      setCurrentRunner(runner);
    },
    [currentWorkspace]
  );

  const handleBuild = useCallback(async (): Promise<RunBuildResult> => {
    if (!buildRunner || buildRunner === NULL_BUILD_RUNNER) return { status: "unknown", build: null };
    await buildRunner.execute();
    if (buildRunner.isSuccessful) {
      return { status: "success", build: buildRunner.build };
    } else if (buildRunner.isFailed) {
      return { status: "failed", build: null };
    } else if (buildRunner.isCancelled) {
      return { status: "cancelled", build: null };
    }
    return { status: "unknown", build: null };
  }, [buildRunner]);

  const handleCancel = useCallback(() => {
    buildRunner.cancel?.();
  }, [buildRunner]);

  return {
    buildRunner,
    logs: buildRunner.logs,
    buildCompleted: buildRunner.completed,
    isBuilding: buildRunner.running,
    runBuild: handleBuild,
    cancelBuild: handleCancel,
    openNew,
    openEdit,
    buildError: buildRunner.error,
  };
}
