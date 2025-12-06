import { BuildDAO } from "@/data/dao/BuildDAO";
import { BuildLogLine, BuildStrategy } from "@/data/dao/BuildRecord";
import { BuildRunner, NULL_BUILD_RUNNER } from "@/services/BuildRunner";
import { Workspace } from "@/workspace/Workspace";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

type RunBuildResult =
  | { status: "success"; build: BuildDAO }
  | { status: "failed"; build: null }
  | { status: "cancelled"; build: null }
  | { status: "unknown"; build: null };

export function useBuildRunner(currentWorkspace: Workspace): {
  buildRunner: BuildRunner;
  logs: BuildLogLine[];
  buildCompleted: boolean;
  isBuilding: boolean;
  runBuild: () => Promise<RunBuildResult>;
  cancelBuild: () => void;
  openNew: (strategy: BuildStrategy) => BuildDAO;
  openEdit: (buildId: string) => Promise<void>;
  clearError: () => void;
  buildError: string | null;
} {
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
    (strategy: BuildStrategy) => {
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
          workspace: currentWorkspace,
        })
      );
      return build;
    },
    [currentWorkspace]
  );

  const openEdit = useCallback(
    async (buildId: string) => {
      setBuildRunner(
        await BuildRunner.recall({
          buildId,
          workspace: currentWorkspace,
        })
      );
    },
    [currentWorkspace]
  );

  const handleBuild = useCallback(async (): Promise<RunBuildResult> => {
    if (!buildRunner || buildRunner === NULL_BUILD_RUNNER) return { status: "unknown", build: null };
    await buildRunner.execute();
    if (buildRunner.isSuccessful) {
      setBuildError(null);
      return { status: "success", build: buildRunner.build };
    } else if (buildRunner.isFailed) {
      setBuildError("Build failed. Please check the logs for more details.");
      return { status: "failed", build: null };
    } else if (buildRunner.isCancelled) {
      setBuildError("Build was cancelled.");
      return { status: "cancelled", build: null };
    }
    return { status: "unknown", build: null };
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
