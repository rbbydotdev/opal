import { CommonFileSystem } from "@/Db/Disk";
import { NotFoundError } from "@/lib/errors";
import Dexie from "dexie";
import path from "path";

interface FileSystemEntry {
  path: string;
  content?: Uint8Array | string;
  type: "file" | "dir";
  parent: string;
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

export class DexieFsDb implements CommonFileSystem {
  private db: Dexie;
  private files: Dexie.Table<FileSystemEntry, string>;

  constructor(name: string) {
    throw new Error("DexieFsDb imp is broken :(");
    this.db = new Dexie(name);
    this.db.version(3).stores({
      files: "&path, parent",
    });

    this.files = this.db.table("files");
  }

  async readdir(
    dirPath: string,
    options?: { withFileTypes?: boolean }
  ): Promise<(string | { name: string; isDirectory: () => boolean; isFile: () => boolean })[]> {
    const entries = (await this.files.where("parent").equals(dirPath).toArray()).filter((e) => e.path !== "/");
    if (options?.withFileTypes) {
      return entries.map((entry) => ({
        name: path.basename(entry.path),
        isDirectory: () => entry.type === "dir",
        isFile: () => entry.type === "file",
      }));
    } else {
      return entries.map((entry) => path.basename(entry.path));
    }
  }

  async stat(filePath: string): Promise<Stats> {
    const entry = await this.files.get(filePath);
    if (!entry) {
      throw new NotFoundError(`ENOENT: no such file or directory, stat '${filePath}'`);
    }
    return {
      type: entry.type,
      size: entry.size,
      mtimeMs: entry.mtimeMs,
      ctimeMs: entry.ctimeMs,
      isFile: () => entry.type === "file",
      isDirectory: () => entry.type === "dir",
    };
  }

  async readFile(filePath: string, options?: { encoding?: "utf8" }): Promise<Uint8Array | string> {
    const entry = await this.files.get(filePath);
    if (!entry || entry.type !== "file") {
      throw new NotFoundError(`ENOENT: no such file or directory, open '${filePath}'`);
    }
    if (options?.encoding === "utf8" && typeof entry.content === "string") {
      return entry.content;
    }
    return entry.content as Uint8Array;
  }

  async mkdir(dirPath: string, _options?: { recursive?: boolean; mode: number }): Promise<string | void> {
    const parentPath = path.dirname(dirPath);
    const parentEntry = await this.files.get(parentPath);
    if (!parentEntry && !_options?.recursive) {
      throw new NotFoundError(`ENOENT: no such file or directory, mkdir '${dirPath}'`);
    }
    await this.files.put({
      path: dirPath,
      type: "dir",
      parent: parentPath,
      size: 0,
      mtimeMs: Date.now(),
      ctimeMs: Date.now(),
    });
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const entry = await this.files.get(oldPath);
    if (!entry) {
      throw new NotFoundError(`ENOENT: no such file or directory, rename '${oldPath}'`);
    }
    await this.files.delete(oldPath);
    entry.path = newPath;
    entry.parent = path.dirname(newPath);
    await this.files.put(entry);
  }

  async unlink(filePath: string): Promise<void> {
    const entry = await this.files.get(filePath);
    if (!entry) {
      throw new NotFoundError(`ENOENT: no such file or directory, unlink '${filePath}'`);
    }
    if (entry.type === "dir") {
      //delete all files whose parent path starts with filePath
      const entries = await this.files.where("parent").startsWith(filePath).toArray();
      for (const entry of entries) {
        await this.files.delete(entry.path);
      }
    }
    await this.files.delete(filePath);
  }

  async writeFile(
    filePath: string,
    data: Uint8Array | string,
    options?: { encoding?: "utf8"; mode: number }
  ): Promise<void> {
    const parentPath = path.dirname(filePath);
    const parentEntry = await this.files.get(parentPath);
    if (!parentEntry) {
      throw new NotFoundError(`ENOENT: no such file or directory, open '${filePath}'`);
    }
    const content =
      options?.encoding === "utf8" && typeof data === "string" ? data : new Uint8Array(data as Uint8Array);
    await this.files.put({
      path: filePath,
      content,
      type: "file",
      parent: parentPath,
      size: content.length,
      mtimeMs: Date.now(),
      ctimeMs: Date.now(),
    });
  }
}
