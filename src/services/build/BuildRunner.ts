import { TreeNode } from "@/components/filetree/TreeNode";
import { BuildDAO, NULL_BUILD } from "@/data/dao/BuildDAO";
import { BuildStrategy } from "@/data/dao/BuildRecord";
import { Disk } from "@/data/disk/Disk";
import { Filter, FilterOutSpecialDirs, SpecialDirs } from "@/data/SpecialDirs";
import { prettifyMime } from "@/editors/prettifyMime";
import { TemplateManager } from "@/features/templating/TemplateManager";
import { DataflowGraph } from "@/lib/DataFlow";
import { getMimeType } from "@/lib/mimeType";
import { absPath, AbsPath, basename, dirname, extname, isTemplateFile, joinPath, relPath, RelPath } from "@/lib/paths2";
import { PageData } from "@/services/build/builder-types";
import { ObservableRunner } from "@/services/build/ObservableRunner";
import { Runner } from "@/types/RunnerInterfaces";
import { Workspace } from "@/workspace/Workspace";
import matter from "gray-matter";
import { marked } from "marked";
import mustache from "mustache";
import slugify from "slugify";

interface BuildContext {
  outputDirectoryReady?: boolean;
  sourceFilesIndexed?: boolean;
  assetsReady?: boolean;
  pages?: PageData[];
  posts?: PageData[];
  templatesProcessed?: boolean;
  bookGenerated?: boolean;
  blogIndexGenerated?: boolean;
  blogPostsGenerated?: boolean;
}

export class BuildRunner extends ObservableRunner<BuildDAO> implements Runner {
  //build,template,template etc should make generic build and deploy objects so observable etc can be shared

  protected abortController: AbortController = new AbortController();

  private templateManager?: TemplateManager;

  get sourceDisk(): Disk {
    return this.target.getSourceDisk();
  }

  get strategy(): BuildStrategy {
    return this.target.strategy;
  }

  get outputDisk(): Disk {
    return this.target.getSourceDisk();
  }

  get outputPath(): AbsPath {
    return this.target.getOutputPath();
  }

  get sourcePath(): AbsPath {
    return this.target.sourcePath;
  }

  static Show({ build, workspace }: { build: BuildDAO; workspace: Workspace }): BuildRunner {
    return NULL_BUILD_RUNNER;
  }

  static async Recall({ buildId, workspace }: { buildId: string; workspace?: Workspace }): Promise<BuildRunner> {
    const build = await BuildDAO.FetchFromGuid(buildId);
    if (!build) throw new Error(`Build with ID ${buildId} not found`);
    return new BuildRunner({
      build,
      workspace,
    });
  }

  cancel(): void {
    this.abortController.abort();
  }

  static Create({
    workspace,
    label,
    strategy,
    build,
  }: {
    workspace: Workspace;
    label: string;
    strategy: BuildStrategy;
    build?: BuildDAO;
  }): BuildRunner {
    const realBuild =
      build ??
      BuildDAO.CreateNew({
        label,
        workspaceId: workspace.guid,
        disk: workspace.disk,
        sourceDisk: workspace.disk,
        strategy,
      });

    return new BuildRunner({
      build: realBuild,
      workspace,
    });
  }

  get fileTree() {
    return this.sourceDisk.fileTree;
  }

  get buildId() {
    return this.target.guid;
  }

  constructor({ build, workspace }: { build: BuildDAO; workspace?: Workspace }) {
    super(build);
    if (workspace) {
      this.templateManager = new TemplateManager(workspace);
    }
  }

  async run({
    abortSignal,
  }: {
    abortSignal?: AbortSignal;
  } = {}): Promise<BuildDAO> {
    const allAbortSignal = AbortSignal.any([this.abortController.signal, abortSignal].filter(Boolean));
    try {
      this.target.status = "pending";
      await this.target.save();
      await this.sourceDisk.refresh();
      this.log(`Starting ${this.strategy} build, id ${this.target.guid}...`, "info");
      this.log(`Source disk: ${this.sourceDisk.guid}`, "info");
      this.log(`Output path: ${this.outputPath}`, "info");

      if (allAbortSignal?.aborted) {
        this.log("Build cancelled", "error");
        this.target.error = "Build was cancelled.";
        this.target.status = "error";
      }

      this.log("Starting build process...", "info");

      const buildGraph = this.createBuildGraph();
      const context = await buildGraph.run({});

      allAbortSignal?.throwIfAborted();

      this.log("Build completed successfully!", "info");

      // Re-index output disk and calculate file count before final update
      await this.outputDisk.triggerIndex().catch((e) => console.warn("Failed to re-index output disk after build:", e));
      this.log(`Build saved with ID: ${this.target.guid}`, "info");
      const count =
        this.outputDisk.fileTree.nodeFromPath(this.outputPath)?.countChildren({
          filterIn: Filter.only(SpecialDirs.Build).$,
        }) ?? 0;

      this.log(`Total files in build output: ${count}`, "info");
      this.target.fileCount = count;
      this.target.status = "success";
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Build failed: ${errorMessage}`, "error");
      this.target.status = "error";
      this.target.error = !allAbortSignal?.aborted ? "Build was cancelled." : `Build failed: ${errorMessage}`;
    } finally {
      await this.target.save();
      return this.target.hydrate();
    }
  }

  private createBuildGraph(): DataflowGraph<BuildContext> {
    let graph = new DataflowGraph<BuildContext>()
      .node("indexSourceFiles", undefined, async () => {
        this.log("Indexing source files...", "info");
        await this.sourceDisk.triggerIndex();
        const fileTree = this.sourceDisk.fileTree;
        this.log(`File tree loaded with ${fileTree ? "files found" : "no files"}`, "info");
        return { sourceFilesIndexed: true };
      })
      .node("ensureOutputDirectory", undefined, async () => {
        await this.ensureOutputDirectory();
        return { outputDirectoryReady: true };
      })
      .node("copyAssets", ["indexSourceFiles", "ensureOutputDirectory"], async () => {
        await this.copyAssets();
        return { assetsReady: true };
      });

    if (this.strategy === "freeform") {
      graph = graph.node("processTemplatesAndMarkdown", ["copyAssets"], async () => {
        await this.processTemplatesAndMarkdown();
        return { templatesProcessed: true };
      });
    } else if (this.strategy === "book") {
      graph = graph
        .node("loadPages", ["indexSourceFiles"], async () => {
          const pages = await this.loadPagesFromDirectory(relPath("_pages"));
          if (pages.length === 0) {
            throw new Error("No pages found in _pages directory for book strategy");
          }
          return { pages };
        })
        .node("generateBook", ["loadPages", "copyAssets"], async (ctx: BuildContext & { pages: PageData[] }) => {
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
          await this.outputDisk.writeFile(indexPath, prettifyMime("text/html", bookHtml));
          this.log("Book page generated", "info");
          return { bookGenerated: true };
        });
    } else if (this.strategy === "blog") {
      graph = graph
        .node("loadPosts", ["indexSourceFiles"], async () => {
          const posts = await this.loadPostsFromDirectory(relPath("posts"));
          return { posts };
        })
        .node("generateBlogIndex", ["loadPosts", "copyAssets"], async (ctx: BuildContext & { posts: PageData[] }) => {
          await this.generateBlogIndex(ctx.posts);
          return { blogIndexGenerated: true };
        })
        .node("generateBlogPosts", ["loadPosts", "copyAssets"], async (ctx: BuildContext & { posts: PageData[] }) => {
          await this.generateBlogPosts(ctx.posts);
          return { blogPostsGenerated: true };
        });
    } else {
      throw new TypeError(`Unknown build strategy: ${this.strategy}`);
    }

    return graph;
  }

  private async ensureOutputDirectory(): Promise<void> {
    this.log("Creating output directory...", "info");
    await this.outputDisk.mkdirRecursive(this.outputPath);
  }


  private async copyAssets(): Promise<void> {
    this.log("Copying assets...", "info");

    // Copy all files except templates, markdown, and files in _ directories
    for (const node of this.sourceDisk.fileTree.iterator(
      (node) => node.isTreeFile() && FilterOutSpecialDirs(node.path)
    )) {
      if (this.shouldCopyAsset(node)) {
        await this.copyFileToOutput(node);
      }
    }
  }

  private async processTemplatesAndMarkdown(): Promise<void> {
    this.log("Processing templates and markdown...", "info");

    for (const node of this.sourceDisk.fileTree.iterator(
      (node) => node.isTreeFile() && FilterOutSpecialDirs(node.path)
    )) {
      if (this.shouldIgnoreFile(node)) continue;

      if (this.isTemplateFile(node)) {
        await this.processTemplate(node);
      } else if (this.isMarkdownFile(node)) {
        await this.processMarkdown(node);
      }
    }
  }

  shouldCopyAsset(node: TreeNode): boolean {
    const path = relPath(node.path);
    return !path.startsWith("_") && !this.isTemplateFile(node) && !this.isMarkdownFile(node);
  }

  shouldIgnoreFile(node: TreeNode): boolean {
    const path = relPath(node.path);
    return path.startsWith("_");
  }

  isTemplateFile(node: TreeNode): boolean {
    return isTemplateFile(node.path);
  }

  // getTemplateType(filePath: string): "mustache" | "ejs" | null {
  //   const mime = getMimeType(filePath);
  //   if (mime === "text/x-mustache") return "mustache";
  //   if (mime === "text/x-ejs") return "ejs";
  //   return null;
  // }

  isMarkdownFile(node: TreeNode): boolean {
    return extname(node.path) === ".md";
  }

  async copyFileToOutput(node: TreeNode): Promise<void> {
    const relativePath = relPath(node.path);
    const outputPath = joinPath(this.outputPath, relativePath);

    // Ensure output directory exists
    await this.ensureDirectoryExists(dirname(outputPath));

    const content = await this.sourceDisk.readFile(node.path);
    await this.outputDisk.writeFile(outputPath, content);

    this.log(`Copied asset: ${relativePath}`, "info");
  }

  async processTemplate(node: TreeNode): Promise<void> {
    const content = String(await this.sourceDisk.readFile(node.path));
    const relativePath = relPath(node.path);
    const outputPath = this.getOutputPathForTemplate(relativePath);

    await this.ensureDirectoryExists(dirname(outputPath));

    const globalCssPath = await this.getGlobalCssPath();

    let html: string;
    if (this.templateManager) {
      // Use TemplateManager which provides proper template data context
      const templateData = {
        globalCssPath,
        // Add template-specific data that contains the date
        it: {
          date: new Date().toISOString(),
        },
        // Add the date directly at the root level too for compatibility
        date: new Date().toISOString(),
        // The helpers will be added by the template manager automatically
      };

      html = await this.templateManager.renderTemplate(node.path, templateData);
    } else {
      // Fallback to direct mustache rendering (legacy behavior)
      html = mustache.render(content, { globalCssPath });
    }

    await this.outputDisk.writeFile(outputPath, prettifyMime("text/html", html));
    this.log(`Template processed: ${relativePath}`, "info");
  }

  async processMarkdown(node: TreeNode): Promise<void> {
    const content = String(await this.sourceDisk.readFile(node.path));
    const { data: frontMatter, content: markdownContent } = matter(content);
    const layout = !frontMatter.layout
      ? DefaultPageLayout
      : await this.loadTemplate(relPath(`_layouts/${frontMatter.layout}.mustache`));
    const htmlContent = await marked(markdownContent);
    const additionalStylePaths = await this.getAdditionalStylePaths(frontMatter.styles || []);
    const globalCssPath = await this.getGlobalCssPath();

    const html = mustache.render(layout, {
      content: htmlContent,
      title: frontMatter.title,
      globalCssPath,
      additionalStylePaths,
      ...frontMatter,
    });

    const relativePath = relPath(node.path);
    const outputPath = this.getOutputPathForMarkdown(relativePath);
    await this.ensureDirectoryExists(dirname(outputPath));
    await this.outputDisk.writeFile(outputPath, prettifyMime("text/html", html));

    this.log(`Markdown processed: ${relativePath}`, "info");
  }

  async loadPagesFromDirectory(dirPath: RelPath): Promise<PageData[]> {
    const pages: PageData[] = [];
    const fullDirPath = joinPath(this.sourcePath, dirPath);

    // Use FileTree to find all markdown files in the directory
    for (const node of this.sourceDisk.fileTree.iterator(
      (node) => node.isTreeFile() && FilterOutSpecialDirs(node.path)
    )) {
      if (node.path.startsWith(fullDirPath) && this.isMarkdownFile(node)) {
        const content = String(await this.sourceDisk.readFile(node.path));
        const { data: frontMatter, content: markdownContent } = matter(content);
        const htmlContent = await marked(markdownContent);

        pages.push({
          path: relPath(node.path.replace(fullDirPath + "/", "")),
          content: markdownContent,
          frontMatter,
          htmlContent,
          node,
        });
      }
    }

    return this.sortPagesByPrefix(pages);
  }

  async loadPostsFromDirectory(dirPath: RelPath): Promise<PageData[]> {
    const posts = await this.loadPagesFromDirectory(dirPath);
    return this.sortPostsByDate(posts);
  }

  generateTableOfContents(pages: PageData[]): string {
    const tocItems = pages.map((page) => {
      const title = page.frontMatter.title || basename(page.path).replace(".md", "");
      const slug = slugify(title, { lower: true, strict: true });
      return `<li><a href="#${slug}">${title}</a></li>`;
    });

    return `<ul class="table-of-contents">${tocItems.join("\n")}</ul>`;
  }

  async generateBlogIndex(posts: PageData[]): Promise<void> {
    const indexLayout = await this.loadTemplate(relPath("blog-index.mustache"));

    const postSummaries = posts.map((post) => ({
      title: post.frontMatter.title,
      summary: post.frontMatter.summary,
      date: post.frontMatter.date,
      url: `/posts/${basename(post.path).replace(".md", ".html")}`,
    }));

    const globalCssPath = await this.getGlobalCssPath();
    const html = mustache.render(indexLayout, {
      posts: postSummaries,
      globalCssPath,
    });

    const indexPath = joinPath(this.outputPath, relPath("index.html"));
    await this.outputDisk.writeFile(indexPath, prettifyMime("text/html", html));
    this.log("Blog index generated", "info");
  }

  async processLayout(post: PageData): Promise<{ layout: string; type: "text/x-mustache" | "text/x-ejs" }> {
    if (post.frontMatter.layout && !isTemplateFile(post.frontMatter.layout)) {
      throw new Error(`Unknown template type for layout: ${post.frontMatter.layout}`);
    }
    const mimeType = getMimeType(post.frontMatter.layout!);
    const type = mimeType === "text/x-mustache" || mimeType === "text/x-ejs" ? mimeType : "text/x-mustache"; // fallback to mustache
    return post.frontMatter.layout
      ? {
          layout: await this.loadTemplate(relPath(`_layouts/${post.frontMatter.layout}`)),
          type,
        }
      : { layout: DefaultPageLayout, type: "text/x-mustache" };
  }
  async generateBlogPosts(posts: PageData[]): Promise<void> {
    const postsOutputPath = joinPath(this.outputPath, relPath("posts"));
    await this.ensureDirectoryExists(postsOutputPath);

    for (const post of posts) {
      const { layout } = await this.processLayout(post);

      const additionalStylePaths = await this.getAdditionalStylePaths(post.frontMatter.styles || []);
      const globalCssPath = await this.getGlobalCssPath();

      const html = mustache.render(layout, {
        content: post.htmlContent,
        title: post.frontMatter.title,
        globalCssPath,
        additionalStylePaths,
        ...post.frontMatter,
      });

      const outputPath = joinPath(postsOutputPath, relPath(basename(post.path).replace(".md", ".html")));
      await this.outputDisk.writeFile(outputPath, prettifyMime("text/html", html));

      this.log(`Blog post generated: ${post.path}`, "info");
    }
  }

  async loadTemplate(templatePath: RelPath): Promise<string> {
    const fullPath = joinPath(this.sourcePath, templatePath);
    try {
      return String(await this.sourceDisk.readFile(fullPath));
    } catch (_err) {
      throw new Error(`Template not found: ${templatePath}`);
    }
  }

  async getGlobalCssPath(): Promise<string | null> {
    try {
      const globalCssPath = joinPath(this.sourcePath, relPath("global.css"));
      await this.sourceDisk.readFile(globalCssPath);
      return absPath("/global.css");
    } catch {
      return null;
    }
  }

  async getAdditionalStylePaths(styleFiles: string[]): Promise<string[]> {
    const validPaths: string[] = [];

    for (const styleFile of styleFiles) {
      try {
        const stylePath = joinPath(this.sourcePath, relPath(styleFile));
        await this.sourceDisk.readFile(stylePath);
        validPaths.push(absPath(`/${styleFile}`));
      } catch (_err) {
        this.log(`Style file not found: ${styleFile}`, "error");
      }
    }

    return validPaths;
  }

  private getOutputPathForTemplate(relativePath: RelPath): AbsPath {
    const outputRelativePath = relativePath.replace(".mustache", ".html").replace(".ejs", ".html");
    return joinPath(this.outputPath, relPath(outputRelativePath));
  }

  private getOutputPathForMarkdown(relativePath: RelPath): AbsPath {
    const outputRelativePath = relativePath.replace(".md", ".html");
    return joinPath(this.outputPath, relPath(outputRelativePath));
  }

  private async ensureDirectoryExists(dirPath: AbsPath): Promise<void> {
    await this.outputDisk.mkdirRecursive(dirPath);
  }

  private sortPagesByPrefix(pages: PageData[]): PageData[] {
    return pages.sort((a, b) => {
      const aName = basename(a.path);
      const bName = basename(b.path);

      const aMatch = aName.match(/^(\d+)_/);
      const bMatch = bName.match(/^(\d+)_/);

      if (aMatch && bMatch && aMatch[1] && bMatch[1]) {
        return parseInt(aMatch[1]) - parseInt(bMatch[1]);
      }

      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;

      return aName.localeCompare(bName);
    });
  }

  private sortPostsByDate(posts: PageData[]): PageData[] {
    return posts.sort((a, b) => {
      const aDate = new Date(a.frontMatter.date || 0);
      const bDate = new Date(b.frontMatter.date || 0);
      return bDate.getTime() - aDate.getTime();
    });
  }
}

class NullBuildRunner extends BuildRunner {
  constructor() {
    super({
      build: NULL_BUILD,
    });
  }

  async run(): Promise<BuildDAO> {
    return this.target;
  }
}
export const NULL_BUILD_RUNNER = new NullBuildRunner();

const DefaultPageLayout = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  {{#globalCssPath}}
  <link rel="stylesheet" href="{{{globalCssPath}}}">
  {{/globalCssPath}}
  {{#additionalStylePaths}}
  {{#.}}
  <link rel="stylesheet" href="{{{.}}}">
  {{/.}}
  {{/additionalStylePaths}}
</head>
<body>
  {{{content}}}
</body>
</html>`;
