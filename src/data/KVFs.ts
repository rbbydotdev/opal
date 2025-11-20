import { CommonFileSystem } from "@/data/FileSystemTypes";
import { coerceFileContent, coerceUint8Array } from "@/lib/coerceUint8Array";

export interface AsyncKeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  keys(prefix?: string): Promise<string[]>;
}
type FileEntry =
  | { type: "file"; data: string | Uint8Array | Buffer }
  | { type: "dir" }
  | { type: "symlink"; target: string };

type FileFileEntry = { type: "file"; data: string | Uint8Array | Buffer };

function isFileEntry(entry: FileEntry): entry is FileFileEntry {
  return entry.type === "file";
}

export class KVFileSystem implements CommonFileSystem {
  constructor(private store: AsyncKeyValueStore) {}

  private async getEntry(path: string): Promise<FileEntry | null> {
    const raw = await this.store.get(path);
    if (!raw) return null;

    const entry = JSON.parse(raw) as FileEntry;
    // Decode base64 data when retrieving file entries
    if (entry.type === "file" && typeof entry.data === "string") {
      try {
        entry.data = atob(entry.data);
      } catch (e) {
        // If not valid base64, keep as is (for backward compatibility)
      }
    }
    return entry;
  }

  private async setEntry(path: string, entry: FileEntry): Promise<void> {
    if (entry.type === "file") {
      let stringData: string;

      if (typeof entry.data === "string") {
        stringData = entry.data;
      } else if (entry.data instanceof Uint8Array) {
        stringData = new TextDecoder().decode(entry.data);
      } else {
        stringData = String(entry.data);
      }

      // Store file data as base64
      entry.data = btoa(stringData);
    }

    await this.store.set(path, JSON.stringify(entry));
  }

  async readdir(path: string) {
    const prefix = path.endsWith("/") ? path : path + "/";
    const keys = await this.store.keys(prefix);
    const entries = new Set<string>();

    for (const key of keys) {
      const relative = key.slice(prefix.length).split("/")[0];
      if (relative) entries.add(relative);
    }

    return Array.from(entries).map((name) => ({
      name,
      isDirectory: () => true, // Simplified: treat as dir if more children exist
      isFile: () => false,
      toString: () => name,
    }));
  }

  async stat(path: string) {
    const entry = await this.getEntry(path);
    if (!entry) throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
    return {
      isDirectory: () => entry.type === "dir",
      isFile: () => entry.type === "file",
      toString: () => path,
    };
  }

  async lstat(path: string) {
    return this.stat(path); // For simplicity, same as stat
  }

  async readFile(path: string, options?: { encoding?: "utf8" }) {
    const entry = await this.getEntry(path);
    if (!entry || entry.type !== "file") {
      throw new Error(`ENOENT: no such file, open '${path}'`);
    }
    return coerceFileContent(entry.data, options);
  }

  async writeFile(path: string, data: Uint8Array | Buffer | string, options?: { encoding?: "utf8"; mode?: number }) {
    const normalizedData = options?.encoding === "utf8" && typeof data === "string" 
      ? data 
      : coerceUint8Array(data);
    await this.setEntry(path, { type: "file", data: normalizedData });
  }

  async mkdir(path: string, options?: { recursive?: boolean; mode?: number }) {
    const entry = await this.getEntry(path);
    if (entry) throw new Error(`EEXIST: file already exists, mkdir '${path}'`);
    await this.setEntry(path, { type: "dir" });
  }

  async rmdir(path: string, options?: { recursive?: boolean }) {
    const entry = await this.getEntry(path);
    if (!entry || entry.type !== "dir") {
      throw new Error(`ENOTDIR: not a directory, rmdir '${path}'`);
    }
    const prefix = path.endsWith("/") ? path : path + "/";
    const children = await this.store.keys(prefix);
    if (children.length > 0 && !options?.recursive) {
      throw new Error(`ENOTEMPTY: directory not empty, rmdir '${path}'`);
    }
    for (const child of children) {
      await this.store.delete(child);
    }
    await this.store.delete(path);
  }

  async unlink(path: string) {
    const entry = await this.getEntry(path);
    if (!entry) throw new Error(`ENOENT: no such file, unlink '${path}'`);
    await this.store.delete(path);
  }

  async rename(oldPath: string, newPath: string) {
    const entry = await this.getEntry(oldPath);
    if (!entry) throw new Error(`ENOENT: no such file, rename '${oldPath}'`);
    await this.setEntry(newPath, entry);
    await this.store.delete(oldPath);
  }

  async symlink(target: string, path: string) {
    await this.setEntry(path, { type: "symlink", target });
  }

  async readlink(path: string) {
    const entry = await this.getEntry(path);
    if (!entry || entry.type !== "symlink") return null;
    return entry.target;
  }
}
export class LocalStorageStore implements AsyncKeyValueStore {
  constructor(private volume: string) {}

  private makeKey(key: string): string {
    return `${this.volume}:${key}`;
  }

  async get(key: string): Promise<string | null> {
    return localStorage.getItem(this.makeKey(key));
  }

  async set(key: string, value: string): Promise<void> {
    localStorage.setItem(this.makeKey(key), value);
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(this.makeKey(key));
  }

  async keys(prefix: string = ""): Promise<string[]> {
    const results: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (!storageKey) continue;
      if (storageKey.startsWith(this.volume + ":")) {
        const relative = storageKey.slice(this.volume.length + 1); // strip "volume:"
        if (relative.startsWith(prefix)) {
          results.push(relative);
        }
      }
    }
    return results;
  }
}
