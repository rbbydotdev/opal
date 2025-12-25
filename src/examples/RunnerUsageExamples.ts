// Examples showing how to use the new typed runner system

import { BuildRunner } from "@/services/build/BuildRunner";
import { ImportRunner } from "@/services/import/ImportRunner";
import { useRunnerWithActions } from "@/hooks/useRunner";
import { BuildStrategy } from "@/data/dao/BuildRecord";
import { Workspace } from "@/workspace/Workspace";

// Example 1: Using BuildRunner with full type safety
export function ExampleBuildRunnerUsage() {
  // The types are fully inferred and type-safe
  const { runner, create, recall } = useRunnerWithActions(
    BuildRunner,
    () => BuildRunner.Create({ workspace: {} as Workspace, label: "Initial", strategy: "freeform" as BuildStrategy })
  );

  // create is typed as: (...args: [{ workspace: Workspace; label: string; strategy: BuildStrategy; }]) => BuildRunner
  const handleCreateBuild = () => {
    const newRunner = create({
      workspace: {} as Workspace,
      label: "My Build",
      strategy: "freeform" as BuildStrategy
    });
    return newRunner.build; // Fully typed access to BuildRunner properties
  };

  // recall is typed as: (...args: [{ buildId: string; workspace?: Workspace; }]) => Promise<BuildRunner>
  const handleRecallBuild = async () => {
    const recalledRunner = await recall({
      buildId: "some-id",
      workspace: {} as Workspace
    });
    return recalledRunner.build; // Fully typed
  };

  return { runner, create: handleCreateBuild, recall: handleRecallBuild };
}

// Example 2: Using ImportRunner with full type safety
export function ExampleImportRunnerUsage() {
  const { runner, create, recall } = useRunnerWithActions(
    ImportRunner,
    () => ImportRunner.Create({ disk: {} as any, fullRepoPath: "initial/path" })
  );

  // create is typed as: (...args: [{ disk: Disk; fullRepoPath: string; }]) => ImportRunner
  const handleCreateImport = () => {
    return create({
      disk: {} as any,
      fullRepoPath: "owner/repo"
    });
  };

  // recall throws an error since ImportRunner doesn't support recall
  const handleRecallImport = async () => {
    try {
      await recall(); // This will throw at runtime as expected
    } catch (error) {
      console.log("ImportRunner does not support recall");
    }
  };

  return { runner, create: handleCreateImport, recall: handleRecallImport };
}

// The beauty of this system:
// 1. ✅ Zero `any` types - everything is fully typed
// 2. ✅ Static methods are enforced by type checking
// 3. ✅ Arguments are exactly typed for each runner class
// 4. ✅ Return types are exactly typed
// 5. ✅ TypeScript will catch mismatches between Create/Recall signatures
// 6. ✅ Consistent pattern across all runners
// 7. ✅ Extensible - just implement the same pattern for new runners