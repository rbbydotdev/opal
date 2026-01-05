import { BuildDAO } from "@/data/dao/BuildDAO";
import { DataflowGraph } from "@/lib/DataFlow";
import { BuildRunner, BaseBuildContext } from "../BuildRunner";
import { Workspace } from "@/workspace/Workspace";

interface FreeformBuildContext extends BaseBuildContext {
  templatesProcessed?: boolean;
}

export class FreeformBuildRunner extends BuildRunner {
  static Show({ build, workspace }: { build: BuildDAO; workspace: Workspace }): FreeformBuildRunner {
    return new FreeformBuildRunner({
      build,
      workspace,
    });
  }

  static async Recall({ buildId, workspace }: { buildId: string; workspace?: Workspace }): Promise<FreeformBuildRunner> {
    const build = await BuildDAO.FetchFromGuid(buildId);
    if (!build) throw new Error(`Build with ID ${buildId} not found`);
    return new FreeformBuildRunner({
      build,
      workspace,
    });
  }

  static Create({
    workspace,
    label,
    build,
  }: {
    workspace: Workspace;
    label: string;
    build?: BuildDAO;
  }): FreeformBuildRunner {
    const realBuild =
      build ??
      BuildDAO.CreateNew({
        label,
        workspaceId: workspace.guid,
        disk: workspace.disk,
        sourceDisk: workspace.disk,
        strategy: "freeform",
      });

    return new FreeformBuildRunner({
      build: realBuild,
      workspace,
    });
  }

  protected createBuildGraph(): DataflowGraph<FreeformBuildContext> {
    return new DataflowGraph<FreeformBuildContext>()
      .node("init", [], async () => {
        this.log("Initializing build...", "info");
        return {};
      })
      .node("indexSourceFiles", [], async () => {
        this.log("Indexing source files...", "info");
        await this.sourceDisk.triggerIndex();
        const fileTree = this.sourceDisk.fileTree;
        this.log(`File tree loaded with ${fileTree ? "files found" : "no files"}`, "info");
        return { sourceFilesIndexed: true };
      })
      .node("ensureOutputDirectory", [], async () => {
        await this.ensureOutputDirectory();
        return { outputDirectoryReady: true };
      })
      .node("copyAssets", ["indexSourceFiles", "ensureOutputDirectory"], async () => {
        await this.copyAssets();
        return { assetsReady: true };
      })
      .node("processTemplatesAndMarkdown", ["copyAssets"], async () => {
        await this.processTemplatesAndMarkdown();
        return { templatesProcessed: true };
      });
  }
}