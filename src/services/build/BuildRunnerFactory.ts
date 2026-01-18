import { BuildDAO } from "@/data/dao/BuildDAO";
import { BuildStrategy } from "@/data/dao/BuildRecord";
import { Workspace } from "@/workspace/Workspace";
import { BuildRunner } from "./BuildRunner";
import { EleventyBuildRunner } from "./EleventyBuildRunner";
import { FreeformBuildRunner } from "./strategies/FreeformBuildRunner";

interface EleventyConfig {
  dir: {
    input: string;
    output: string;
    includes: string;
    data: string;
    layouts?: string;
  };
}

export class BuildRunnerFactory {
  static Show({ build, workspace }: { build: BuildDAO; workspace: Workspace }): BuildRunner {
    switch (build.strategy) {
      case "freeform":
        return FreeformBuildRunner.Show({ build, workspace });
      case "eleventy":
        return EleventyBuildRunner.Show({ build, workspace });
      default:
        throw new Error(`Unknown build strategy: ${build.strategy}`);
    }
  }

  static async Recall({ buildId, workspace }: { buildId: string; workspace?: Workspace }): Promise<BuildRunner> {
    const build = await BuildDAO.FetchFromGuid(buildId);
    if (!build) throw new Error(`Build with ID ${buildId} not found`);

    switch (build.strategy) {
      case "freeform":
        return FreeformBuildRunner.Recall({ buildId, workspace });
      case "eleventy":
        return EleventyBuildRunner.Recall({ buildId, workspace });
      default:
        throw new Error(`Unknown build strategy: ${build.strategy}`);
    }
  }

  static Create({
    workspace,
    label,
    strategy,
    build,
    config,
  }: {
    workspace: Workspace;
    label: string;
    strategy: BuildStrategy;
    build?: BuildDAO;
    config?: Partial<EleventyConfig>;
  }): BuildRunner {
    switch (strategy) {
      case "freeform":
        return FreeformBuildRunner.Create({ workspace, label, build });
      case "eleventy":
        return EleventyBuildRunner.Create({ workspace, label, build, config });
      default:
        throw new Error(`Unknown build strategy: ${strategy}`);
    }
  }
}

// Null object for default cases
class NullBuildRunner extends BuildRunner {
  constructor() {
    super({
      build: {
        guid: "null",
        label: "null",
        strategy: "freeform",
        status: "idle",
        error: null,
        fileCount: 0,
        logs: [],
        timestamp: Date.now(),
        workspaceId: "",
        sourcePath: "" as any,
        buildPath: "" as any,
        disk: { type: "memory", guid: "", label: "" },
        sourceDisk: { type: "memory", guid: "", label: "" },
        getOutputPath: () => "" as any,
        getSourceDisk: () => ({}) as any,
        save: async () => {},
        hydrate: () => ({}) as any,
      } as any,
    });
  }

  protected createBuildGraph() {
    return this.createBaseBuildGraph();
  }

  async run(): Promise<BuildDAO> {
    return this.target;
  }
}

export const NULL_BUILD_RUNNER = new NullBuildRunner() as BuildRunner;
