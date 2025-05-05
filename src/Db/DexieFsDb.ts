import Dexie from "dexie";

interface FileSystemEntry {
  path: string;
  content?: Uint8Array | string;
  type: "file" | "dir";
  size: number;
  mtimeMs: number;
  ctimeMs: number;
}

interface Stats {
  type: "file" | "dir";
  size: number;
  mtimeMs: number;
  ctimeMs: number;
  isFile(): boolean;
  isDirectory(): boolean;
}

export class DexieFsDb {
  private db: Dexie;
  private files: Dexie.Table<FileSystemEntry, string>;

  constructor(name: string) {
    // Initialize the database.
    this.db = new Dexie(name);
    this.db.version(1).stores({
      files: "&path, type, content, size, mtimeMs, ctimeMs",
    });

    this.files = this.db.table("files");
  }

  async readdir(
    path: string,
    options?: { withFileTypes?: boolean }
  ): Promise<(string | { name: string; isDirectory: () => boolean; isFile: () => boolean })[]> {
    const entries = await this.files.where("path").startsWith(`${path}/`).toArray();
    if (options?.withFileTypes) {
      return entries.map((entry) => ({
        name: entry.path.slice(path.length + 1), // Remove the parent directory part
        isDirectory: () => entry.type === "dir",
        isFile: () => entry.type === "file",
      }));
    } else {
      return entries.map((entry) => entry.path.slice(path.length + 1));
    }
  }

  async stat(path: string): Promise<Stats> {
    const entry = await this.files.get(path);
    if (!entry) throw new Error("File not found");
    return {
      type: entry.type,
      size: entry.size,
      mtimeMs: entry.mtimeMs,
      ctimeMs: entry.ctimeMs,
      isFile: () => entry.type === "file",
      isDirectory: () => entry.type === "dir",
    };
  }

  async readFile(path: string, options?: { encoding?: "utf8" }): Promise<Uint8Array | string> {
    const file = await this.files.get(path);
    if (!file || file.type !== "file") throw new Error("File not found or path is a directory");
    if (options?.encoding === "utf8") {
      if (typeof file.content === "string") {
        return file.content;
      } else {
        return new TextDecoder().decode(file.content);
      }
    }
    return file.content!;
  }

  async mkdir(path: string, _options?: { recursive?: boolean; mode: number }): Promise<string | void> {
    const now = Date.now();
    await this.files.add({ path, type: "dir", size: 0, mtimeMs: now, ctimeMs: now });
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const entry = await this.files.get(oldPath);
    if (!entry) throw new Error("File or directory not found");
    await this.files.put({ ...entry, path: newPath });
    await this.files.delete(oldPath);
  }

  async unlink(path: string): Promise<void> {
    const entry = await this.files.get(path);
    if (!entry) throw new Error("File not found");
    if (entry.type === "dir") {
      const children = await this.files.where("path").startsWith(`${path}/`).toArray();
      if (children.length > 0) throw new Error("Directory is not empty");
    }
    await this.files.delete(path);
  }

  async writeFile(
    path: string,
    data: Uint8Array | string,
    options?: { encoding?: "utf8"; mode: number }
  ): Promise<void> {
    const now = Date.now();
    let content: Uint8Array | string;
    let size: number;

    if (typeof data === "string") {
      if (options?.encoding === "utf8") {
        content = data;
        size = new TextEncoder().encode(content).length;
      } else {
        content = new TextEncoder().encode(data);
        size = content.length;
      }
    } else {
      content = data;
      size = data.length;
    }

    await this.files.put({ path, content, type: "file", size, mtimeMs: now, ctimeMs: now });
  }
}

// Usage example
