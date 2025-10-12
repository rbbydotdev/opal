import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  isDirectory: boolean;
}

export interface ProcessedFile {
  originalPath: string;
  outputPath: string;
  content: string;
  frontMatter?: any;
}

export class BuildHelpers {
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static async ensureDirectory(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  static async copyFile(src: string, dest: string): Promise<void> {
    await this.ensureDirectory(path.dirname(dest));
    await fs.copyFile(src, dest);
  }

  static async readFileIfExists(filePath: string): Promise<string | null> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  static async getDirectoryContents(dirPath: string): Promise<FileInfo[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries.map(entry => ({
        path: path.join(dirPath, entry.name),
        name: entry.name,
        extension: path.extname(entry.name),
        isDirectory: entry.isDirectory()
      }));
    } catch {
      return [];
    }
  }

  static async findFilesRecursively(
    dirPath: string, 
    filter?: (file: FileInfo) => boolean
  ): Promise<string[]> {
    const files: string[] = [];
    const contents = await this.getDirectoryContents(dirPath);
    
    for (const item of contents) {
      if (item.isDirectory) {
        files.push(...await this.findFilesRecursively(item.path, filter));
      } else if (!filter || filter(item)) {
        files.push(item.path);
      }
    }
    
    return files;
  }

  static isTemplateFile(filePath: string): boolean {
    return filePath.endsWith('.mustache') || filePath.endsWith('.ejs');
  }

  static isMarkdownFile(filePath: string): boolean {
    return filePath.endsWith('.md');
  }

  static isCssFile(filePath: string): boolean {
    return filePath.endsWith('.css');
  }

  static isAssetFile(filePath: string): boolean {
    const assetExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
    return assetExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
  }

  static shouldIgnoreDirectory(dirName: string | undefined): boolean {
    if (!dirName) return false;
    return dirName.startsWith('_') || dirName.startsWith('.') || dirName === 'node_modules';
  }

  static async parseMarkdownWithFrontMatter(filePath: string): Promise<{
    content: string;
    frontMatter: any;
    htmlContent: string;
  }> {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const { data: frontMatter, content } = matter(fileContent);
    const htmlContent = await marked(content);
    
    return {
      content,
      frontMatter,
      htmlContent
    };
  }

  static generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const isoString = d.toISOString();
    const datePart = isoString.split('T')[0];
    return datePart || '';
  }

  static extractTitle(content: string, frontMatter: any, fallback: string): string {
    if (frontMatter.title) return frontMatter.title;
    
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match && h1Match[1]) return h1Match[1];
    
    return fallback;
  }

  static async collectStyles(styleFiles: string[], basePath: string): Promise<string> {
    const styles: string[] = [];
    
    for (const styleFile of styleFiles) {
      const stylePath = path.resolve(basePath, styleFile);
      const content = await this.readFileIfExists(stylePath);
      if (content) {
        styles.push(content);
      }
    }
    
    return styles.join('\n');
  }

  static async collectScripts(scriptFiles: string[], basePath: string): Promise<string> {
    const scripts: string[] = [];
    
    for (const scriptFile of scriptFiles) {
      const scriptPath = path.resolve(basePath, scriptFile);
      const content = await this.readFileIfExists(scriptPath);
      if (content) {
        scripts.push(content);
      }
    }
    
    return scripts.join('\n');
  }

  static getOutputPath(inputPath: string, sourcePath: string, outputPath: string, newExtension?: string): string {
    const relativePath = path.relative(sourcePath, inputPath);
    let outputFilePath = path.join(outputPath, relativePath);
    
    if (newExtension) {
      const parsed = path.parse(outputFilePath);
      outputFilePath = path.join(parsed.dir, parsed.name + newExtension);
    }
    
    return outputFilePath;
  }

  static sortPagesByPrefix(pages: Array<{ path: string; [key: string]: any }>): Array<{ path: string; [key: string]: any }> {
    return pages.sort((a, b) => {
      const aName = path.basename(a.path);
      const bName = path.basename(b.path);
      
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

  static sortPostsByDate(posts: Array<{ frontMatter: any; [key: string]: any }>): Array<{ frontMatter: any; [key: string]: any }> {
    return posts.sort((a, b) => {
      const aDate = new Date(a.frontMatter.date || 0);
      const bDate = new Date(b.frontMatter.date || 0);
      return bDate.getTime() - aDate.getTime();
    });
  }

  static async validateTemplate(templatePath: string): Promise<void> {
    if (!(await this.fileExists(templatePath))) {
      throw new Error(`Template not found: ${templatePath}`);
    }
  }

  static async validateMarkdownLayout(markdownPath: string, frontMatter: any, sourcePath: string): Promise<void> {
    if (!frontMatter.layout) {
      throw new Error(`Missing layout in front matter for ${markdownPath}`);
    }
    
    const layoutPath = path.join(sourcePath, '_layouts', `${frontMatter.layout}.mustache`);
    await this.validateTemplate(layoutPath);
  }

  static generateBreadcrumbs(filePath: string, sourcePath: string): Array<{ name: string; path: string }> {
    const relativePath = path.relative(sourcePath, filePath);
    const parts = relativePath.split(path.sep);
    const breadcrumbs: Array<{ name: string; path: string }> = [];
    
    let currentPath = '';
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (part) {
        currentPath = path.join(currentPath, part);
        breadcrumbs.push({
          name: part,
          path: currentPath
        });
      }
    }
    
    return breadcrumbs;
  }

  static async generateSitemap(outputPath: string, baseUrl: string): Promise<void> {
    const htmlFiles = await this.findFilesRecursively(outputPath, (file) => 
      file.extension === '.html'
    );
    
    const urls = htmlFiles.map(file => {
      const relativePath = path.relative(outputPath, file);
      const url = new URL(relativePath.replace(/\\/g, '/'), baseUrl).toString();
      return `  <url><loc>${url}</loc></url>`;
    });
    
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
    
    await fs.writeFile(path.join(outputPath, 'sitemap.xml'), sitemap);
  }

  static async copyAssets(sourcePath: string, outputPath: string, filter?: (filePath: string) => boolean): Promise<void> {
    const allFiles = await this.findFilesRecursively(sourcePath);
    
    for (const file of allFiles) {
      const relativePath = path.relative(sourcePath, file);
      
      const firstDir = path.dirname(relativePath).split(path.sep)[0];
      if (this.shouldIgnoreDirectory(firstDir)) {
        continue;
      }
      
      if (this.isTemplateFile(file) || this.isMarkdownFile(file)) {
        continue;
      }
      
      if (filter && !filter(file)) {
        continue;
      }
      
      const outputFile = path.join(outputPath, relativePath);
      await this.copyFile(file, outputFile);
    }
  }

  static createLogger(prefix: string = 'Build'): {
    log: (message: string) => void;
    error: (message: string) => void;
    step: (step: string) => void;
  } {
    return {
      log: (message: string) => console.log(`[${prefix}] ${message}`),
      error: (message: string) => console.error(`[${prefix}] ERROR: ${message}`),
      step: (step: string) => console.log(`[${prefix}] → ${step}`)
    };
  }
}