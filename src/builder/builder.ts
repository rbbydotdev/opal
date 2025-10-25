import { Disk } from "@/Db/Disk";
import { FileTree } from "@/lib/FileTree/Filetree";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, RelPath, joinPath, relPath } from "@/lib/paths2";
import { Mutex } from "async-mutex";
import mustache from "mustache";
import { BuilderMethods } from "./builder-methods";

export type BuildStrategy = "freeform" | "book" | "blog";

export interface BuildOptions {
  strategy: BuildStrategy;
  sourceDisk: Disk;
  outputDisk: Disk;
  sourcePath: AbsPath;
  outputPath: AbsPath;
  onLog?: (message: string) => void;
  onError?: (error: string) => void;
}

export interface FrontMatter {
  layout?: string;
  title?: string;
  summary?: string;
  styles?: string[];
  scripts?: string[];
  [key: string]: any;
}

export interface PageData {
  path: RelPath;
  content: string;
  frontMatter: FrontMatter;
  htmlContent: string;
  node: TreeNode;
}

export class Builder {
  private options: BuildOptions;
  private log: (message: string) => void;
  private error: (error: string) => void;
  private sourceTree: FileTree;
  private methods: BuilderMethods;
  private mutex = new Mutex();

  constructor(options: BuildOptions) {
    this.options = options;
    this.log = options.onLog || console.log;
    this.error = options.onError || console.error;
    this.sourceTree = new FileTree(options.sourceDisk.fs, "builder-source", this.mutex);
    this.methods = new BuilderMethods(options, this.log, this.error, this.sourceTree);
  }

  async build(): Promise<void> {
    try {
      this.log("Starting build process...");

      // Index the source directory
      this.log("Indexing source files...");
      await this.sourceTree.index();

      await this.ensureOutputDirectory();

      switch (this.options.strategy) {
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
          throw new Error(`Unknown build strategy: ${this.options.strategy}`);
      }

      this.log("Build completed successfully!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.error(`Build failed: ${errorMessage}`);
      throw err;
    }
  }

  private async ensureOutputDirectory(): Promise<void> {
    this.log("Creating output directory...");
    await this.options.outputDisk.mkdirRecursive(this.options.outputPath);
  }

  private async buildFreeform(): Promise<void> {
    this.log("Building with freeform strategy...");

    await this.copyAssets();
    await this.processTemplatesAndMarkdown();
  }

  private async buildBook(): Promise<void> {
    this.log("Building with book strategy...");

    await this.copyAssets();

    const pages = await this.methods.loadPagesFromDirectory(relPath("_pages"));

    if (pages.length === 0) {
      throw new Error("No pages found in _pages directory for book strategy");
    }

    const tableOfContents = this.methods.generateTableOfContents(pages);
    const combinedContent = pages.map((page) => page.htmlContent).join('\n<div class="page-break"></div>\n');

    const bookLayout = await this.methods.loadTemplate(relPath("book.mustache"));
    const globalCss = await this.methods.getGlobalCss();
    const bookHtml = mustache.render(bookLayout, {
      tableOfContents,
      content: combinedContent,
      globalCss,
    });

    const indexPath = joinPath(this.options.outputPath, relPath("index.html"));
    await this.options.outputDisk.writeFile(indexPath, bookHtml);
    this.log("Book page generated");
  }

  private async buildBlog(): Promise<void> {
    this.log("Building with blog strategy...");

    await this.copyAssets();

    const posts = await this.methods.loadPostsFromDirectory(relPath("posts"));

    await this.methods.generateBlogIndex(posts);
    await this.methods.generateBlogPosts(posts);
  }

  private async copyAssets(): Promise<void> {
    this.log("Copying assets...");

    // Copy all files except templates, markdown, and files in _ directories
    for (const node of this.sourceTree.files()) {
      if (this.methods.shouldCopyAsset(node)) {
        await this.methods.copyFileToOutput(node);
      }
    }
  }

  private async processTemplatesAndMarkdown(): Promise<void> {
    this.log("Processing templates and markdown...");

    for (const node of this.sourceTree.files()) {
      if (this.methods.shouldIgnoreFile(node)) continue;

      if (this.methods.isTemplateFile(node)) {
        await this.methods.processTemplate(node);
      } else if (this.methods.isMarkdownFile(node)) {
        await this.methods.processMarkdown(node);
      }
    }
  }
}
