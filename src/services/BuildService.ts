import { BuildStrategy, PageData } from "@/builder/builder-types";
import { BuildDAO } from "@/data/BuildDAO";
import { BuildLogLine } from "@/data/BuildRecord";
import { Disk } from "@/data/disk/Disk";
import { NullDisk } from "@/data/NullDisk";
import { FilterOutSpecialDirs, SpecialDirs } from "@/data/SpecialDirs";
import { Workspace } from "@/data/Workspace";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { absPath, AbsPath, basename, dirname, extname, joinPath, relPath, RelPath } from "@/lib/paths2";
import { getMimeType } from "@zip.js/zip.js";
import matter from "gray-matter";
import { marked } from "marked";
import mustache from "mustache";
import slugify from "slugify";

export interface BuildServiceOptions {
  strategy: BuildStrategy;
  workspaceId: string;
  abortSignal?: AbortSignal;
  onLog?: (message: string) => void;
  onError?: (message: string) => void;
}

export interface BuildResult {
  success: boolean;
  buildDao?: BuildDAO;
  error?: string;
}

export class BuildService {
  onLog: (message: string) => void;
  onError: (message: string) => void;
  sourceDisk: Disk = new NullDisk();
  outputDisk: Disk = new NullDisk();
  outputPath: AbsPath;
  sourcePath: AbsPath;
  workspaceName: string;
  strategy: BuildStrategy;
  logs: BuildLogLine[] = [];

  get fileTree() {
    return this.sourceDisk.fileTree;
  }

  private log(message: string, type: "info" | "error" | "warning" = "info") {
    const logLine: BuildLogLine = {
      timestamp: new Date(),
      message,
      type,
    };
    this.logs.push(logLine);

    if (type === "error") {
      this.onError(message);
    } else {
      this.onLog(message);
    }
  }

  private logInfo(message: string) {
    this.log(message, "info");
  }

  private logError(message: string) {
    this.log(message, "error");
  }

  private logWarning(message: string) {
    this.log(message, "warning");
  }

  constructor({
    onLog,
    onError,
    outputPath = SpecialDirs.Build,
    sourcePath = absPath("/"),
    workspaceName,
    strategy,
  }: {
    onLog: (message: string) => void;
    onError: (message: string) => void;
    workspaceName: string;
    outputPath?: AbsPath;
    sourcePath?: AbsPath;

    strategy: BuildStrategy;
  }) {
    this.onLog = onLog;
    this.onError = onError;
    this.outputPath = outputPath;
    this.sourcePath = sourcePath;
    this.workspaceName = workspaceName;
    this.strategy = strategy;
  }
  tearDown() {
    // Clean up resources if needed
  }
  async executeBuild({ strategy, abortSignal }: BuildServiceOptions): Promise<BuildResult> {
    let currentWorkspace: Workspace | null = null;
    try {
      this.logInfo(`Starting ${strategy} build...`);
      this.logInfo("Filtering out special directories");

      if (abortSignal?.aborted) {
        this.logError("Build cancelled");
        return { success: false, error: "Build cancelled" };
      }

      this.logInfo("Starting build process...");
      this.logInfo("Loading workspace...");
      currentWorkspace = await Workspace.FromNameAndInit(this.workspaceName);
      if (!currentWorkspace) {
        throw new Error("Workspace not found");
      }
      const sourceDisk = currentWorkspace.getDisk();
      this.sourceDisk = sourceDisk;
      this.outputDisk = sourceDisk;
      this.logInfo(`Using source disk: ${sourceDisk.guid}`);
      this.logInfo("Building file tree...");

      // Index the source directory
      this.logInfo("Indexing source files...");
      await this.sourceDisk.triggerIndex();
      this.sourceDisk.fileTree;

      await this.ensureOutputDirectory();

      if (abortSignal?.aborted) {
        this.logError("Build cancelled");
        return { success: false, error: "Build cancelled" };
      }

      switch (this.strategy) {
        case "freeform":
          await this.buildFreeform();
          break;
        case "book":
          await this.buildBook();
          break;
        case "blog":
          await this.buildBlog();
          break;
        default:
          throw new Error(`Unknown build strategy: ${this.strategy}`);
      }

      if (abortSignal?.aborted) {
        this.logError("Build cancelled");
        return { success: false, error: "Build cancelled" };
      }

      this.logInfo("Build completed successfully!");

      const buildDao = await this.createBuildRecord(strategy, this.sourceDisk);
      this.logInfo(`Build saved with ID: ${buildDao.guid}`);

      return { success: true, buildDao };
    } catch (error) {
      if (!abortSignal?.aborted) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logError(`Build failed: ${errorMessage}`);
        return { success: false, error: errorMessage };
      }
      return { success: false, error: "Build cancelled" };
    } finally {
      if (currentWorkspace) {
        await currentWorkspace.tearDown();
      }
    }
  }

  private async createBuildRecord(strategy: BuildStrategy, sourceDisk: Disk): Promise<BuildDAO> {
    const buildLabel = `${strategy.charAt(0).toUpperCase() + strategy.slice(1)} Build - ${new Date().toLocaleString()}`;
    const buildDao = await BuildDAO.CreateNew(buildLabel, sourceDisk.guid);
    buildDao.logs = this.logs;
    await buildDao.save();
    return buildDao;
  }

  private async ensureOutputDirectory(): Promise<void> {
    this.logInfo("Creating output directory...");
    await this.outputDisk.mkdirRecursive(this.outputPath);
  }

  private async buildFreeform(): Promise<void> {
    this.logInfo("Building with freeform strategy...");

    await this.copyAssets();
    await this.processTemplatesAndMarkdown();
  }

  private async buildBook(): Promise<void> {
    this.logInfo("Building with book strategy...");

    await this.copyAssets();

    const pages = await this.loadPagesFromDirectory(relPath("_pages"));

    if (pages.length === 0) {
      throw new Error("No pages found in _pages directory for book strategy");
    }

    const tableOfContents = this.generateTableOfContents(pages);
    const combinedContent = pages.map((page) => page.htmlContent).join('\n<div class="page-break"></div>\n');

    const bookLayout = await this.loadTemplate(relPath("book.mustache"));
    const globalCss = await this.getGlobalCss();
    const bookHtml = mustache.render(bookLayout, {
      tableOfContents,
      content: combinedContent,
      globalCss,
    });

    const indexPath = joinPath(this.outputPath, relPath("index.html"));
    await this.outputDisk.writeFile(indexPath, bookHtml);
    this.logInfo("Book page generated");
  }

  private async buildBlog(): Promise<void> {
    this.logInfo("Building with blog strategy...");

    await this.copyAssets();

    const posts = await this.loadPostsFromDirectory(relPath("posts"));

    await this.generateBlogIndex(posts);
    await this.generateBlogPosts(posts);
  }

  private async copyAssets(): Promise<void> {
    this.logInfo("Copying assets...");

    // Copy all files except templates, markdown, and files in _ directories
    for (const node of this.sourceDisk.fileTree.iterator((node) => node.isTreeFile() && FilterOutSpecialDirs(node.path))) {
      if (this.shouldCopyAsset(node)) {
        await this.copyFileToOutput(node);
      }
    }
  }

  private async processTemplatesAndMarkdown(): Promise<void> {
    this.logInfo("Processing templates and markdown...");

    for (const node of this.sourceDisk.fileTree.iterator((node) => node.isTreeFile() && FilterOutSpecialDirs(node.path))) {
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
    return this.getTemplateType(node.path) !== null;
  }

  getTemplateType(filePath: string): "mustache" | "ejs" | null {
    const mime = getMimeType(filePath);
    if (mime === "text/x-mustache") return "mustache";
    if (mime === "text/x-ejs") return "ejs";
    return null;
  }

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

    this.logInfo(`Copied asset: ${relativePath}`);
  }

  async processTemplate(node: TreeNode): Promise<void> {
    const content = String(await this.sourceDisk.readFile(node.path));
    const relativePath = relPath(node.path);
    const outputPath = this.getOutputPathForTemplate(relativePath);

    await this.ensureDirectoryExists(dirname(outputPath));

    const globalCss = await this.getGlobalCss();
    const html = mustache.render(content, { globalCss });

    await this.outputDisk.writeFile(outputPath, html);
    this.logInfo(`Template processed: ${relativePath}`);
  }

  async processMarkdown(node: TreeNode): Promise<void> {
    const content = String(await this.sourceDisk.readFile(node.path));
    const { data: frontMatter, content: markdownContent } = matter(content);
    const layout = !frontMatter.layout
      ? DefaultPageLayout
      : await this.loadTemplate(relPath(`_layouts/${frontMatter.layout}.mustache`));
    const htmlContent = await marked(markdownContent);
    const additionalStyles = await this.getAdditionalStyles(frontMatter.styles || []);
    const globalCss = await this.getGlobalCss();

    const html = mustache.render(layout, {
      content: htmlContent,
      title: frontMatter.title,
      globalCss,
      additionalStyles,
      ...frontMatter,
    });

    const relativePath = relPath(node.path);
    const outputPath = this.getOutputPathForMarkdown(relativePath);
    await this.ensureDirectoryExists(dirname(outputPath));
    await this.outputDisk.writeFile(outputPath, html);

    this.logInfo(`Markdown processed: ${relativePath}`);
  }

  async loadPagesFromDirectory(dirPath: RelPath): Promise<PageData[]> {
    const pages: PageData[] = [];
    const fullDirPath = joinPath(this.sourcePath, dirPath);

    // Use FileTree to find all markdown files in the directory
    for (const node of this.sourceDisk.fileTree.iterator((node) => node.isTreeFile() && FilterOutSpecialDirs(node.path))) {
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

    const globalCss = await this.getGlobalCss();
    const html = mustache.render(indexLayout, {
      posts: postSummaries,
      globalCss,
    });

    const indexPath = joinPath(this.outputPath, relPath("index.html"));
    await this.outputDisk.writeFile(indexPath, html);
    this.logInfo("Blog index generated");
  }

  async processLayout(post: PageData): Promise<{ layout: string; type: "mustache" | "ejs" }> {
    if (post.frontMatter.layout && !this.getTemplateType(post.frontMatter.layout)) {
      throw new Error(`Unknown template type for layout: ${post.frontMatter.layout}`);
    }
    return post.frontMatter.layout
      ? {
          layout: await this.loadTemplate(relPath(`_layouts/${post.frontMatter.layout}`)),
          type: this.getTemplateType(post.frontMatter.layout)!,
        }
      : { layout: DefaultPageLayout, type: "mustache" };
  }
  async generateBlogPosts(posts: PageData[]): Promise<void> {
    const postsOutputPath = joinPath(this.outputPath, relPath("posts"));
    await this.ensureDirectoryExists(postsOutputPath);

    for (const post of posts) {
      const { layout } = await this.processLayout(post);

      const additionalStyles = await this.getAdditionalStyles(post.frontMatter.styles || []);
      const globalCss = await this.getGlobalCss();

      const html = mustache.render(layout, {
        content: post.htmlContent,
        title: post.frontMatter.title,
        globalCss,
        additionalStyles,
        ...post.frontMatter,
      });

      const outputPath = joinPath(postsOutputPath, relPath(basename(post.path).replace(".md", ".html")));
      await this.outputDisk.writeFile(outputPath, html);

      this.logInfo(`Blog post generated: ${post.path}`);
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

  async getGlobalCss(): Promise<string> {
    try {
      const globalCssPath = joinPath(this.sourcePath, relPath("global.css"));
      return String(await this.sourceDisk.readFile(globalCssPath));
    } catch {
      return "";
    }
  }

  async getAdditionalStyles(styleFiles: string[]): Promise<string> {
    const styles: string[] = [];

    for (const styleFile of styleFiles) {
      try {
        const stylePath = joinPath(this.sourcePath, relPath(styleFile));
        const content = String(await this.sourceDisk.readFile(stylePath));
        styles.push(content);
      } catch (_err) {
        this.logError(`Style file not found: ${styleFile}`);
      }
    }

    return styles.join("\n");
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

const DefaultPageLayout = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  <style>
    {{#globalCss}}
    {{{globalCss}}}
    {{/globalCss}}
    {{#additionalStyles}}
    {{{additionalStyles}}}
    {{/additionalStyles}}
  </style>
</head>
<body>
  {{{content}}}
</body>
</html>`;
