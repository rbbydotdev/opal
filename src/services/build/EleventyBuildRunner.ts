import { TreeNode } from "@/components/filetree/TreeNode";
import { BuildDAO, NULL_BUILD } from "@/data/dao/BuildDAO";
import { Filter, FilterOutSpecialDirs, SpecialDirs } from "@/data/SpecialDirs";
import { prettifyMime } from "@/editors/prettifyMime";
import { TemplateManager } from "@/features/templating/TemplateManager";
import { DataflowGraph } from "@/lib/DataFlow";
import { getMimeType } from "@/lib/mimeType";
import {
  absPath,
  AbsPath,
  basename,
  dirname,
  extname,
  isTemplateFile,
  joinPath,
  relPath,
  RelPath
} from "@/lib/paths2";
import { PageData } from "@/services/build/builder-types";
import { Workspace } from "@/workspace/Workspace";
import matter from "gray-matter";
import { marked } from "marked";
import mustache from "mustache";
import { BuildRunner } from "./BuildRunner";

interface EleventyConfig {
  dir: {
    input: string;
    output: string;
    includes: string;
    data: string;
    layouts?: string;
  };
}

interface EleventyBuildContext {
  outputDirectoryReady?: boolean;
  sourceFilesIndexed?: boolean;
  globalDataLoaded?: boolean;
  assetsReady?: boolean;
  templatesProcessed?: boolean;
  globalData?: Record<string, any>;
  directoryData?: Map<string, any>;
  config?: EleventyConfig;
}

interface EleventyPageData extends PageData {
  data: Record<string, any>; // Combined data from all sources
  inputPath: string;
  outputPath: string;
  url: string;
}

export class EleventyBuildRunner extends BuildRunner {

  private config: EleventyConfig = {
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
      data: "_data",
      layouts: undefined // Can be same as includes or separate
    }
  };

  static Show({ build, workspace }: { build: BuildDAO; workspace: Workspace }): EleventyBuildRunner {
    return NULL_ELEVENTY_BUILD_RUNNER;
  }

  static async Recall({ buildId, workspace }: { buildId: string; workspace?: Workspace }): Promise<EleventyBuildRunner> {
    const build = await BuildDAO.FetchFromGuid(buildId);
    if (!build) throw new Error(`Build with ID ${buildId} not found`);
    return new EleventyBuildRunner({
      build,
      workspace,
    });
  }

  static Create({
    workspace,
    label,
    build,
    config,
  }: {
    workspace: Workspace;
    label: string;
    build?: BuildDAO;
    config?: Partial<EleventyConfig>;
  }): EleventyBuildRunner {
    const realBuild =
      build ??
      BuildDAO.CreateNew({
        label,
        workspaceId: workspace.guid,
        disk: workspace.disk,
        sourceDisk: workspace.disk,
        strategy: "eleventy",
      });

    return new EleventyBuildRunner({
      build: realBuild,
      workspace,
      config,
    });
  }


  constructor({ build, workspace, config }: {
    build: BuildDAO;
    workspace?: Workspace;
    config?: Partial<EleventyConfig>;
  }) {
    super({ build, workspace });
    // TemplateManager is now set in the base class

    // Merge custom config with defaults
    if (config?.dir) {
      this.config.dir = { ...this.config.dir, ...config.dir };
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
      this.log(
        `Starting Eleventy build, id ${this.target.guid} - Source disk: ${this.sourceDisk.guid} - Output path: ${this.outputPath}`,
        "info"
      );
      this.log("Starting Eleventy build process...", "info");
      await this.createBuildGraph().run({});
      this.log("Eleventy build completed successfully!", "info");

      // Re-index output disk and calculate file count before final update
      await this.outputDisk.triggerIndex().catch((e) => console.warn("Failed to re-index output disk after build:", e));
      this.log(`Build saved with ID: ${this.target.guid}`, "info");
      const count =
        this.outputDisk.fileTree.nodeFromPath(this.outputPath)?.countChildren({
          filterIn: Filter.only(SpecialDirs.Build),
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

  protected createBuildGraph(): DataflowGraph<EleventyBuildContext> {
    return new DataflowGraph<EleventyBuildContext>()
      .node("init", [], async () => {
        this.log("Initializing Eleventy build...", "info");
        return { config: this.config };
      })

      .node("indexSourceFiles", [], async () => {
        this.log("Indexing source files...", "info");
        await this.sourceDisk.triggerIndex();
        return { sourceFilesIndexed: true };
      })

      .node("ensureOutputDirectory", [], async () => {
        await this.ensureOutputDirectory();
        return { outputDirectoryReady: true };
      })

      .node("loadGlobalData", ["indexSourceFiles"], async () => {
        this.log("Loading global data...", "info");
        const globalData = await this.loadGlobalData();
        return { globalDataLoaded: true, globalData };
      })

      .node("loadDirectoryData", ["indexSourceFiles"], async () => {
        this.log("Loading directory data...", "info");
        const directoryData = await this.loadDirectoryData();
        return { directoryData };
      })

      .node("copyAssets", ["indexSourceFiles", "ensureOutputDirectory"], async () => {
        await this.copyStaticFiles();
        return { assetsReady: true };
      })

      .node("processTemplates", ["loadGlobalData", "loadDirectoryData", "copyAssets"], async (ctx) => {
        await this.processAllTemplates(ctx.globalData || {}, ctx.directoryData || new Map());
        return { templatesProcessed: true };
      });
  }

  protected async ensureOutputDirectory(): Promise<void> {
    await super.ensureOutputDirectory();
    this.log("Creating Eleventy output directory...", "info");
    const outputPath = joinPath(this.sourcePath, relPath(this.config.dir.output));
    await this.outputDisk.mkdirRecursive(outputPath);
  }

  protected async loadGlobalData(): Promise<Record<string, any>> {
    const globalData: Record<string, any> = {};
    const dataDir = joinPath(this.sourcePath, relPath(this.config.dir.data));

    try {
      // Check if _data directory exists
      const dataDirNode = this.sourceDisk.fileTree.nodeFromPath(dataDir);
      if (!dataDirNode) {
        this.log("No _data directory found, skipping global data", "info");
        return globalData;
      }

      // Load all JSON files from _data directory
      for (const node of this.sourceDisk.fileTree.iterator(
        (node) => node.isTreeFile() && node.path.startsWith(dataDir)
      )) {
        const ext = extname(node.path);
        if (ext === ".json") {
          try {
            const content = String(await this.sourceDisk.readFile(node.path));
            const fileName = basename(node.path);
            globalData[fileName.replace(ext, "")] = JSON.parse(content);
            this.log(`Loaded global data: ${fileName}`, "info");
          } catch (error) {
            this.log(`Failed to load global data file: ${node.path} - ${error}`, "error");
          }
        }
      }
    } catch (error) {
      this.log(`Error loading global data: ${error}`, "error");
    }

    return globalData;
  }

  protected async loadDirectoryData(): Promise<Map<string, any>> {
    const directoryData = new Map<string, any>();

    // Load template and directory data files
    // Look for files like posts.json (for posts/ directory) or page.json (for page.md)
    for (const node of this.sourceDisk.fileTree.iterator(
      (node) => node.isTreeFile() && FilterOutSpecialDirs(node.path)
    )) {
      const ext = extname(node.path);
      if (ext === ".json") {
        try {
          const content = String(await this.sourceDisk.readFile(node.path));
          const dirPath = dirname(node.path);
          const fileName = basename(node.path);
          const data = JSON.parse(content);

          // Store data by directory path and filename
          const key = `${dirPath}/${fileName}`;
          directoryData.set(key, data);

          this.log(`Loaded directory data: ${key}`, "info");
        } catch (error) {
          this.log(`Failed to load directory data file: ${node.path} - ${error}`, "error");
        }
      }
    }

    return directoryData;
  }

  protected async copyStaticFiles(): Promise<void> {
    this.log("Copying static files...", "info");

    // Copy all files that are not templates, markdown, or in special directories
    for (const node of this.sourceDisk.fileTree.iterator(
      (node) => node.isTreeFile() && FilterOutSpecialDirs(node.path)
    )) {
      if (this.shouldCopyStaticFile(node)) {
        await this.copyFileToOutput(node);
      }
    }
  }

  protected shouldCopyStaticFile(node: TreeNode): boolean {
    const path = relPath(node.path);
    const dirName = dirname(path);

    // Skip files in special directories
    if (path.startsWith("_") || dirName.startsWith("_")) {
      return false;
    }

    // Skip template and markdown files
    if (this.isTemplateFile(node) || this.isMarkdownFile(node)) {
      return false;
    }

    // Skip data files (JSON that aren't templates)
    const ext = extname(node.path);
    if (ext === ".json") {
      return false;
    }

    return true;
  }

  protected async copyFileToOutput(node: TreeNode): Promise<void> {
    const relativePath = this.getRelativePathFromInput(node.path);
    const outputPath = joinPath(
      this.sourcePath,
      relPath(this.config.dir.output),
      relativePath
    );

    await this.ensureDirectoryExists(dirname(outputPath));

    const content = await this.sourceDisk.readFile(node.path);
    await this.writeFile(outputPath, content);

    this.log(`Copied static file: ${relativePath}`, "info");
  }

  protected async processAllTemplates(
    globalData: Record<string, any>,
    directoryData: Map<string, any>
  ): Promise<void> {
    this.log("Processing all templates and content...", "info");

    // Process all markdown and template files
    for (const node of this.sourceDisk.fileTree.iterator(
      (node) => node.isTreeFile() && FilterOutSpecialDirs(node.path)
    )) {
      if (this.shouldProcessFile(node)) {
        await this.processFile(node, globalData, directoryData);
      }
    }
  }

  protected shouldProcessFile(node: TreeNode): boolean {
    const path = relPath(node.path);

    // Skip files in special directories (except for direct access)
    if (path.startsWith("_")) {
      return false;
    }

    // Process markdown and template files
    return this.isMarkdownFile(node) || this.isTemplateFile(node);
  }

  protected async processFile(
    node: TreeNode,
    globalData: Record<string, any>,
    directoryData: Map<string, any>
  ): Promise<void> {
    const content = String(await this.sourceDisk.readFile(node.path));
    const relativePath = this.getRelativePathFromInput(node.path);

    // Parse front matter
    const { data: frontMatter, content: bodyContent } = matter(content);

    // Build data cascade: global → directory → template → front matter
    const combinedData = this.buildDataCascade(node.path, globalData, directoryData, frontMatter);

    // Create page data
    const pageData: EleventyPageData = {
      path: relativePath,
      content: bodyContent,
      frontMatter,
      htmlContent: "",
      node,
      data: combinedData,
      inputPath: node.path,
      outputPath: this.getOutputPath(relativePath, frontMatter),
      url: this.getUrl(relativePath, frontMatter)
    };

    // Process content based on file type
    if (this.isMarkdownFile(node)) {
      pageData.htmlContent = await marked(bodyContent);
    } else if (this.isTemplateFile(node)) {
      pageData.htmlContent = await this.renderTemplate(bodyContent, combinedData, node.path);
    }

    // Apply layout if specified
    const finalHtml = await this.applyLayout(pageData);

    // Write output file
    const outputPath = joinPath(this.sourcePath, relPath(pageData.outputPath));
    await this.ensureDirectoryExists(dirname(outputPath));
    await this.writeFile(outputPath, await prettifyMime("text/html", finalHtml));

    this.log(`Processed: ${relativePath} → ${pageData.outputPath}`, "info");
  }

  private buildDataCascade(
    filePath: string,
    globalData: Record<string, any>,
    directoryData: Map<string, any>,
    frontMatter: Record<string, any>
  ): Record<string, any> {
    const dirPath = dirname(filePath);
    const fileName = basename(filePath).replace(extname(filePath), "");

    // Start with global data
    let data = { ...globalData };

    // Add directory-specific data
    const dirDataKey = `${dirPath}/${basename(dirPath)}`;
    if (directoryData.has(dirDataKey)) {
      data = { ...data, ...directoryData.get(dirDataKey) };
    }

    // Add template-specific data
    const templateDataKey = `${dirPath}/${fileName}`;
    if (directoryData.has(templateDataKey)) {
      data = { ...data, ...directoryData.get(templateDataKey) };
    }

    // Add front matter data (highest priority)
    data = { ...data, ...frontMatter };

    // Add Eleventy-specific data
    data.page = {
      url: this.getUrl(this.getRelativePathFromInput(filePath), frontMatter),
      outputPath: this.getOutputPath(this.getRelativePathFromInput(filePath), frontMatter),
      inputPath: filePath,
      filePathStem: fileName,
      date: frontMatter.date || new Date()
    };

    return data;
  }

  private async renderTemplate(
    content: string,
    data: Record<string, any>,
    templatePath: string
  ): Promise<string> {
    const mimeType = getMimeType(templatePath);

    // Use TemplateManager if available
    if (this.templateManager) {
      return await this.templateManager.renderTemplate(absPath(templatePath), data);
    } else {
      // Fallback to mustache
      return mustache.render(content, data);
    }
  }

  private async applyLayout(pageData: EleventyPageData): Promise<string> {
    const layoutName = pageData.data.layout;

    if (!layoutName) {
      return pageData.htmlContent;
    }

    // Look for layout in _includes directory
    const layoutPath = joinPath(
      this.sourcePath,
      relPath(this.config.dir.includes),
      relPath(`${layoutName}`)
    );

    try {
      const layoutContent = String(await this.sourceDisk.readFile(layoutPath));
      const { data: layoutFrontMatter, content: layoutTemplate } = matter(layoutContent);

      // Merge layout front matter with page data (page data takes precedence)
      const layoutData = { ...layoutFrontMatter, ...pageData.data, content: pageData.htmlContent };

      // Render layout
      const renderedLayout = await this.renderTemplate(layoutTemplate, layoutData, layoutPath);

      // Check if layout has its own layout (layout chaining)
      if (layoutFrontMatter.layout) {
        const chainedPageData: EleventyPageData = {
          ...pageData,
          htmlContent: renderedLayout,
          data: { ...pageData.data, layout: layoutFrontMatter.layout }
        };
        return await this.applyLayout(chainedPageData);
      }

      return renderedLayout;
    } catch (error) {
      this.log(`Layout not found: ${layoutName}, using content without layout`, "warning");
      return pageData.htmlContent;
    }
  }

  private getRelativePathFromInput(absolutePath: string): RelPath {
    const inputPath = joinPath(this.sourcePath, relPath(this.config.dir.input));
    if (absolutePath.startsWith(inputPath)) {
      return relPath(absolutePath.slice(inputPath.length + 1));
    }
    return relPath(absolutePath);
  }

  private getOutputPath(inputPath: RelPath, frontMatter: Record<string, any>): string {
    // Check for custom permalink
    if (frontMatter.permalink) {
      return frontMatter.permalink.startsWith("/")
        ? frontMatter.permalink.slice(1)
        : frontMatter.permalink;
    }

    // Default transformation
    const outputPath = inputPath
      .replace(/\.md$/, ".html")
      .replace(/\.mustache$/, ".html")
      .replace(/\.njk$/, ".html")
      .replace(/\.liquid$/, ".html")
      .replace(/\.ejs$/, ".html");

    return `${this.config.dir.output}/${outputPath}`;
  }

  private getUrl(inputPath: RelPath, frontMatter: Record<string, any>): string {
    // Check for custom permalink
    if (frontMatter.permalink) {
      return frontMatter.permalink.startsWith("/")
        ? frontMatter.permalink
        : "/" + frontMatter.permalink;
    }

    // Default URL transformation
    const url = inputPath
      .replace(/\.md$/, ".html")
      .replace(/\.mustache$/, ".html")
      .replace(/\.njk$/, ".html")
      .replace(/\.liquid$/, ".html")
      .replace(/\.ejs$/, ".html")
      .replace(/index\.html$/, "");

    return "/" + url;
  }

  protected async ensureDirectoryExists(dirPath: AbsPath): Promise<void> {
    await this.outputDisk.mkdirRecursive(dirPath);
  }

  protected async writeFile(filePath: AbsPath, content: string | Uint8Array | Blob): Promise<AbsPath> {
    return await this.outputDisk.newFileQuiet(filePath, content);
  }

  protected isMarkdownFile(node: TreeNode): boolean {
    return extname(node.path) === ".md";
  }

  protected isTemplateFile(node: TreeNode): boolean {
    return isTemplateFile(node.path);
  }
}

class NullEleventyBuildRunner extends EleventyBuildRunner {
  constructor() {
    super({
      build: NULL_BUILD,
    });
  }

  async run(): Promise<BuildDAO> {
    return this.target;
  }
}

export const NULL_ELEVENTY_BUILD_RUNNER = new NullEleventyBuildRunner();