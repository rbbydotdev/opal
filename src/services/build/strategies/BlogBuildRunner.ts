import { BuildDAO } from "@/data/dao/BuildDAO";
import { DataflowGraph } from "@/lib/DataFlow";
import { BuildRunner, BaseBuildContext } from "../BuildRunner";
import { Workspace } from "@/workspace/Workspace";
import { PageData } from "@/services/build/builder-types";
import { relPath } from "@/lib/paths2";

interface BlogBuildContext extends BaseBuildContext {
  posts?: PageData[];
  blogIndexGenerated?: boolean;
  blogPostsGenerated?: boolean;
}

export class BlogBuildRunner extends BuildRunner {
  static Show({ build, workspace }: { build: BuildDAO; workspace: Workspace }): BlogBuildRunner {
    return new BlogBuildRunner({
      build,
      workspace,
    });
  }

  static async Recall({ buildId, workspace }: { buildId: string; workspace?: Workspace }): Promise<BlogBuildRunner> {
    const build = await BuildDAO.FetchFromGuid(buildId);
    if (!build) throw new Error(`Build with ID ${buildId} not found`);
    return new BlogBuildRunner({
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
  }): BlogBuildRunner {
    const realBuild =
      build ??
      BuildDAO.CreateNew({
        label,
        workspaceId: workspace.guid,
        disk: workspace.disk,
        sourceDisk: workspace.disk,
        strategy: "blog",
      });

    return new BlogBuildRunner({
      build: realBuild,
      workspace,
    });
  }

  protected createBuildGraph(): DataflowGraph<BlogBuildContext> {
    return new DataflowGraph<BlogBuildContext>()
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
      .node("loadPosts", ["indexSourceFiles"], async () => {
        const posts = await this.loadPostsFromDirectory(relPath("posts"));
        return { posts };
      })
      .node("generateBlogIndex", ["loadPosts", "copyAssets"], async (ctx) => {
        await this.generateBlogIndex(ctx.posts);
        return { blogIndexGenerated: true };
      })
      .node("generateBlogPosts", ["loadPosts", "copyAssets"], async (ctx) => {
        await this.generateBlogPosts(ctx.posts);
        return { blogPostsGenerated: true };
      });
  }
}