import { BuildDAO } from "@/data/dao/BuildDAO";
import { DataflowGraph } from "@/lib/DataFlow";
import { BuildRunner, BaseBuildContext } from "../BuildRunner";
import { Workspace } from "@/workspace/Workspace";
import { PageData } from "@/services/build/builder-types";
import { relPath, joinPath } from "@/lib/paths2";
import mustache from "mustache";
import { prettifyMime } from "@/editors/prettifyMime";

interface BookBuildContext extends BaseBuildContext {
  pages?: PageData[];
  bookGenerated?: boolean;
}

export class BookBuildRunner extends BuildRunner {
  static Show({ build, workspace }: { build: BuildDAO; workspace: Workspace }): BookBuildRunner {
    return new BookBuildRunner({
      build,
      workspace,
    });
  }

  static async Recall({ buildId, workspace }: { buildId: string; workspace?: Workspace }): Promise<BookBuildRunner> {
    const build = await BuildDAO.FetchFromGuid(buildId);
    if (!build) throw new Error(`Build with ID ${buildId} not found`);
    return new BookBuildRunner({
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
  }): BookBuildRunner {
    const realBuild =
      build ??
      BuildDAO.CreateNew({
        label,
        workspaceId: workspace.guid,
        disk: workspace.disk,
        sourceDisk: workspace.disk,
        strategy: "book",
      });

    return new BookBuildRunner({
      build: realBuild,
      workspace,
    });
  }

  protected createBuildGraph(): DataflowGraph<BookBuildContext> {
    return new DataflowGraph<BookBuildContext>()
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
      .node("loadPages", ["indexSourceFiles"], async () => {
        const pages = await this.loadPagesFromDirectory(relPath("_pages"));
        if (pages.length === 0) {
          throw new Error("No pages found in _pages directory for book strategy");
        }
        return { pages };
      })
      .node("generateBook", ["loadPages", "copyAssets"], async (ctx: BookBuildContext & { pages: PageData[] }) => {
        const tableOfContents = this.generateTableOfContents(ctx.pages);
        const combinedContent = ctx.pages.map((page) => page.htmlContent).join('\n<div class="page-break"></div>\n');

        const bookLayout = await this.loadTemplate(relPath("book.mustache"));
        const globalCssPath = await this.getGlobalCssPath();
        const bookHtml = mustache.render(bookLayout, {
          tableOfContents,
          content: combinedContent,
          globalCssPath,
        });

        const indexPath = joinPath(this.outputPath, relPath("index.html"));
        await this.writeFile(indexPath, await prettifyMime("text/html", bookHtml));
        this.log("Book page generated", "info");
        return { bookGenerated: true };
      });
  }
}