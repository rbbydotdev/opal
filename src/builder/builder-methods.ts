// Helper methods for the Builder class - split into separate file for clarity
import { FileTree } from "@/lib/FileTree/Filetree";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, RelPath, basename, dirname, extname, joinPath, relPath } from "@/lib/paths2";
import matter from "gray-matter";
import { marked } from "marked";
import mustache from "mustache";
import slugify from "slugify";
import { BuildOptions, PageData } from "./builder";

export class BuilderMethods {
  constructor(
    private options: BuildOptions,
    private log: (message: string) => void,
    private error: (message: string) => void,
    private sourceTree: FileTree
  ) {}

  shouldCopyAsset(node: TreeNode): boolean {
    const path = relPath(node.path);
    return !path.startsWith("_") && !this.isTemplateFile(node) && !this.isMarkdownFile(node);
  }

  shouldIgnoreFile(node: TreeNode): boolean {
    const path = relPath(node.path);
    return path.startsWith("_");
  }

  isTemplateFile(node: TreeNode): boolean {
    const ext = extname(node.path);
    return ext === ".mustache" || ext === ".ejs";
  }

  isMarkdownFile(node: TreeNode): boolean {
    return extname(node.path) === ".md";
  }

  async copyFileToOutput(node: TreeNode): Promise<void> {
    const relativePath = relPath(node.path);
    const outputPath = joinPath(this.options.outputPath, relativePath);

    // Ensure output directory exists
    await this.ensureDirectoryExists(dirname(outputPath));

    const content = await this.options.sourceDisk.readFile(node.path);
    await this.options.outputDisk.writeFile(outputPath, content);

    this.log(`Copied asset: ${relativePath}`);
  }

  async processTemplate(node: TreeNode): Promise<void> {
    const content = String(await this.options.sourceDisk.readFile(node.path));
    const relativePath = relPath(node.path);
    const outputPath = this.getOutputPathForTemplate(relativePath);

    await this.ensureDirectoryExists(dirname(outputPath));

    const globalCss = await this.getGlobalCss();
    const html = mustache.render(content, { globalCss });

    await this.options.outputDisk.writeFile(outputPath, html);
    this.log(`Template processed: ${relativePath}`);
  }

  async processMarkdown(node: TreeNode): Promise<void> {
    const content = String(await this.options.sourceDisk.readFile(node.path));
    const { data: frontMatter, content: markdownContent } = matter(content);

    if (!frontMatter.layout) {
      throw new Error(`Missing layout in front matter for ${node.path}`);
    }

    const layout = await this.loadTemplate(relPath(`_layouts/${frontMatter.layout}.mustache`));
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
    await this.options.outputDisk.writeFile(outputPath, html);

    this.log(`Markdown processed: ${relativePath}`);
  }

  async loadPagesFromDirectory(dirPath: RelPath): Promise<PageData[]> {
    const pages: PageData[] = [];
    const fullDirPath = joinPath(this.options.sourcePath, dirPath);

    // Use FileTree to find all markdown files in the directory
    for (const node of this.sourceTree.files()) {
      if (node.path.startsWith(fullDirPath) && this.isMarkdownFile(node)) {
        const content = String(await this.options.sourceDisk.readFile(node.path));
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

    const indexPath = joinPath(this.options.outputPath, relPath("index.html"));
    await this.options.outputDisk.writeFile(indexPath, html);
    this.log("Blog index generated");
  }

  async generateBlogPosts(posts: PageData[]): Promise<void> {
    const postsOutputPath = joinPath(this.options.outputPath, relPath("posts"));
    await this.ensureDirectoryExists(postsOutputPath);

    for (const post of posts) {
      if (!post.frontMatter.layout) {
        throw new Error(`Missing layout in front matter for ${post.path}`);
      }

      const layout = await this.loadTemplate(relPath(`_layouts/${post.frontMatter.layout}.mustache`));
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
      await this.options.outputDisk.writeFile(outputPath, html);

      this.log(`Blog post generated: ${post.path}`);
    }
  }

  async loadTemplate(templatePath: RelPath): Promise<string> {
    const fullPath = joinPath(this.options.sourcePath, templatePath);
    try {
      return String(await this.options.sourceDisk.readFile(fullPath));
    } catch (err) {
      throw new Error(`Template not found: ${templatePath}`);
    }
  }

  async getGlobalCss(): Promise<string> {
    try {
      const globalCssPath = joinPath(this.options.sourcePath, relPath("global.css"));
      return String(await this.options.sourceDisk.readFile(globalCssPath));
    } catch {
      return "";
    }
  }

  async getAdditionalStyles(styleFiles: string[]): Promise<string> {
    const styles: string[] = [];

    for (const styleFile of styleFiles) {
      try {
        const stylePath = joinPath(this.options.sourcePath, relPath(styleFile));
        const content = String(await this.options.sourceDisk.readFile(stylePath));
        styles.push(content);
      } catch (err) {
        this.error(`Style file not found: ${styleFile}`);
      }
    }

    return styles.join("\n");
  }

  private getOutputPathForTemplate(relativePath: RelPath): AbsPath {
    const outputRelativePath = relativePath.replace(".mustache", ".html").replace(".ejs", ".html");
    return joinPath(this.options.outputPath, relPath(outputRelativePath));
  }

  private getOutputPathForMarkdown(relativePath: RelPath): AbsPath {
    const outputRelativePath = relativePath.replace(".md", ".html");
    return joinPath(this.options.outputPath, relPath(outputRelativePath));
  }

  private async ensureDirectoryExists(dirPath: AbsPath): Promise<void> {
    await this.options.outputDisk.mkdirRecursive(dirPath);
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
