import { relPath } from "@/lib/paths2";
import { FsaNodeFs } from "memfs/lib/fsa-to-node";
import { IFileSystemDirectoryHandle } from "memfs/lib/fsa/types";
import { CommonFileSystem } from "./CommonFileSystem";

/**
 * Patched OPFS filesystem specifically for directory-mounted disks.
 * Handles root directory edge cases where "/" paths would fail with the browser FSA API.
 */
export class PatchedDirMountOPFS implements CommonFileSystem {
  private fsaNodeFs: FsaNodeFs;
  private root: IFileSystemDirectoryHandle | Promise<IFileSystemDirectoryHandle>;

  constructor(root: IFileSystemDirectoryHandle | Promise<IFileSystemDirectoryHandle>) {
    this.root = root;
    this.fsaNodeFs = new FsaNodeFs(root);
  }

  // Expose the promises API for compatibility
  get promises() {
    return this.fsaNodeFs.promises;
  }

  private isRootPath(path: string): boolean {
    // Check various root path patterns
    if (!path || path === "/" || path === "/." || path === "//.") {
      return true;
    }
    const normalizedPath = this.normalizePath(path);
    return normalizedPath === "";
  }

  private normalizePath(path: string): string {
    // Handle undefined, null, empty, or root paths
    if (!path || path === "/" || path === "/." || path === "//.") {
      return "";
    }

    // Use relPath utility to normalize the path
    try {
      const normalized = relPath(path);

      return normalized;
    } catch (_error) {
      return "";
    }
  }

  // Implement CommonFileSystem interface methods with root directory handling
  async readdir(
    path: string
  ): Promise<
    (
      | string
      | Buffer<ArrayBufferLike>
      | { name: string | Buffer<ArrayBufferLike>; isDirectory: () => boolean; isFile: () => boolean }
    )[]
  > {
    if (this.isRootPath(path)) {
      const rootHandle = await this.root;
      const entries = [];
      for await (const [name, _handle] of rootHandle.entries()) {
        entries.push(name);
      }
      return entries;
    }
    const normalizedPath = this.normalizePath(path);

    return this.promises.readdir(normalizedPath);
  }

  async stat(path: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }> {
    if (this.isRootPath(path)) {
      const now = new Date();
      return {
        isDirectory: () => true,
        isFile: () => false,
        mode: 16877, // directory mode
        size: 0,
        mtime: now,
        mtimeMs: now.getTime(),
        ctime: now,
        ctimeMs: now.getTime(),
        atime: now,
        atimeMs: now.getTime(),
        birthtime: now,
        birthtimeMs: now.getTime(),
        dev: 0,
        ino: 0,
        nlink: 1,
        uid: 0,
        gid: 0,
        rdev: 0,
        blksize: 4096,
        blocks: 0,
      } as any;
    }
    const normalizedPath = this.normalizePath(path);

    return this.promises.stat(normalizedPath);
  }

  async readFile(path: string, options?: { encoding?: "utf8" }): Promise<Uint8Array | Buffer | string> {
    if (this.isRootPath(path)) {
      throw new Error("Cannot read root directory as file");
    }
    const normalizedPath = this.normalizePath(path);
    return this.promises.readFile(normalizedPath, options);
  }

  async mkdir(path: string, options?: { recursive?: boolean; mode: number }): Promise<string | void> {
    if (this.isRootPath(path)) {
      return path; // Root directory already exists
    }
    const normalizedPath = this.normalizePath(path);
    return this.promises.mkdir(normalizedPath, options);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    if (this.isRootPath(oldPath)) {
      throw new Error("Cannot rename root directory");
    }

    try {
      const stat = await this.stat(oldPath);
      if (!stat.isDirectory()) {
        const normalizedOldPath = this.normalizePath(oldPath);
        const normalizedNewPath = this.normalizePath(newPath);
        return this.promises.rename(normalizedOldPath, normalizedNewPath);
      }

      // Handle directory rename with recursive copy
      await this.recursiveDirectoryMove(oldPath, newPath);
    } catch (error) {
      throw error;
    }
  }

  async unlink(path: string): Promise<void> {
    if (this.isRootPath(path)) {
      throw new Error("Cannot unlink root directory");
    }
    const normalizedPath = this.normalizePath(path);

    // Check if path is a directory first
    try {
      const stat = await this.stat(path);
      if (stat.isDirectory()) {
        // Use rmdir for directories
        return this.promises.rmdir(normalizedPath, { recursive: true });
      }
    } catch (_error) {
      // If stat fails, proceed with unlink attempt
    }

    // For files, use unlink or fallback to rm
    return this.promises.unlink
      ? this.promises.unlink(normalizedPath)
      : this.promises.rm(normalizedPath, { recursive: true, force: true });
  }

  async writeFile(
    path: string,
    data: Uint8Array | Buffer | string,
    options?: { encoding?: "utf8"; mode: number }
  ): Promise<void> {
    if (this.isRootPath(path)) {
      throw new Error("Cannot write to root directory as file");
    }
    const normalizedPath = this.normalizePath(path);
    return this.promises.writeFile(normalizedPath, data, options);
  }

  async rmdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    if (this.isRootPath(path)) {
      throw new Error("Cannot remove root directory");
    }
    const normalizedPath = this.normalizePath(path);
    return this.promises.rmdir(normalizedPath, options);
  }

  async lstat(path: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }> {
    // Not bothering with symlinks for OPFS, just use stat
    return this.stat(path);
  }

  async symlink(_target: string, _path: string): Promise<void> {
    throw new Error("OPFS does not support symlinks");
  }

  async readlink(_path: string): Promise<Buffer<ArrayBufferLike> | string | null> {
    throw new Error("OPFS does not support readlink");
  }

  // Add rm method for compatibility
  async rm(path: string, options?: { force?: boolean; recursive?: boolean }): Promise<void> {
    if (this.isRootPath(path)) {
      throw new Error("Cannot remove root directory");
    }
    const normalizedPath = this.normalizePath(path);
    return this.promises.rm(normalizedPath, options);
  }

  private async recursiveDirectoryMove(oldPath: string, newPath: string): Promise<void> {
    // Create target directory
    await this.mkdir(newPath, { recursive: true, mode: 0o777 });

    // Get entries from source directory
    const entries = (await this.readdir(oldPath)).map((e) => String(e));

    for (const entry of entries) {
      const sourcePath = `${oldPath}/${entry}`;
      const targetPath = `${newPath}/${entry}`;

      const stat = await this.stat(sourcePath);
      if (stat.isDirectory()) {
        await this.recursiveDirectoryMove(sourcePath, targetPath);
      } else {
        // Copy file
        const content = await this.readFile(sourcePath);
        await this.writeFile(targetPath, content);
      }
    }

    // Remove source directory
    await this.rm(oldPath, { recursive: true, force: true });
  }
}
