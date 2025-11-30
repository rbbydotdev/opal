import { BuildDAO } from "@/data/BuildDAO";
import { BuildLogLine, BuildStrategy } from "@/data/BuildRecord";
import { Workspace } from "@/data/Workspace";
import { BuildRunner, NULL_BUILD_RUNNER } from "@/services/BuildRunner";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export interface UseBuildRunnerReturn {
  buildRunner: BuildRunner;
  logs: BuildLogLine[];
  buildCompleted: boolean;
  isBuilding: boolean;
  runBuild: () => Promise<void>;
  cancelBuild: () => void;
  openNew: (strategy: BuildStrategy) => Promise<void>;
  openEdit: (buildId: string) => Promise<void>;
  clearError: () => void;
  buildError: string | null;
}

export function useBuildRunner(currentWorkspace: Workspace): UseBuildRunnerReturn {
  const [buildRunner, setBuildRunner] = useState<BuildRunner>(NULL_BUILD_RUNNER);
  const [buildError, setBuildError] = useState<string | null>(null);

  // Teardown when buildRunner changes
  useEffect(() => {
    return () => {
      buildRunner.tearDown();
    };
  }, [buildRunner]);

  // Subscribe to external store for logs and completion
  const logs = useSyncExternalStore(buildRunner.onLog, buildRunner.getLogs);
  const buildCompleted = useSyncExternalStore(buildRunner.onComplete, buildRunner.getComplete);

  const isBuilding = buildRunner.isBuilding;

  const openNew = useCallback(
    async (strategy: BuildStrategy) => {
      const build = BuildDAO.CreateNew({
        label: `Build ${new Date().toLocaleString()}`,
        workspaceId: currentWorkspace.guid,
        disk: currentWorkspace.getDisk(),
        sourceDisk: currentWorkspace.getDisk(),
        strategy,
        logs: [],
      });
      setBuildRunner(
        BuildRunner.create({
          build,
        })
      );
    },
    [currentWorkspace]
  );

  const openEdit = useCallback(async (buildId: string) => {
    setBuildRunner(
      await BuildRunner.recall({
        buildId,
      })
    );
  }, []);

  const handleBuild = useCallback(async () => {
    if (!buildRunner || buildRunner === NULL_BUILD_RUNNER) return;
    await buildRunner.execute();
    if (buildRunner.isSuccessful) {
      setBuildError(null);
    } else if (buildRunner.isFailed) {
      setBuildError("Build failed. Please check the logs for more details.");
    } else if (buildRunner.isCancelled) {
      setBuildError("Build was cancelled.");
    }
  }, [buildRunner]);

  const handleCancel = useCallback(() => {
    buildRunner?.cancel();
  }, [buildRunner]);

  const clearError = useCallback(() => {
    setBuildError(null);
  }, []);

  return {
    buildRunner,
    logs,
    buildCompleted,
    isBuilding,
    runBuild: handleBuild,
    cancelBuild: handleCancel,
    openNew,
    openEdit,
    buildError,
    clearError,
  };
}
