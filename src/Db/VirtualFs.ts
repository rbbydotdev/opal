import { CommonFileSystem } from "@/Db/FileSystemTypes";

// A helper interface for defining mount points.
export interface MountPoint {
  fs: CommonFileSystem;
  mountPath: string;
}

// A custom error class for file system errors.
class FsError extends Error {
  public code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "FsError";
    this.code = code;
  }
}

/**
 * A virtual file system that combines multiple file systems at different mount points.
 */
export class VirtualFileSystem implements CommonFileSystem {
  private mounts: MountPoint[];

  /**
   * Creates an instance of VirtualFileSystem.
   * @param mounts An array of mount points.
   */
  constructor(mounts: MountPoint[]) {
    // Sort mounts by path length, descending. This is crucial for `_resolvePath`
    // to find the most specific mount first (e.g., /a/b before /a).
    this.mounts = mounts
      .map((m) => ({
        ...m,
        // Normalize mount path to not have a trailing slash, unless it's the root.
        mountPath: m.mountPath.length > 1 ? m.mountPath.replace(/\/$/, "") : m.mountPath,
      }))
      .sort((a, b) => b.mountPath.length - a.mountPath.length);
  }
  symlink(_target: string, _path: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  readlink(_path: string): Promise<Buffer<ArrayBufferLike> | string | null> {
    throw new Error("Method not implemented.");
  }

  /**
   * Resolves a virtual path to a specific file system and a relative path within it.
   * @param path The virtual path to resolve.
   * @returns The responsible file system and the relative path, or null if not found.
   */
  private _resolvePath(path: string): { fs: CommonFileSystem; relativePath: string } | null {
    for (const mount of this.mounts) {
      if (path.startsWith(mount.mountPath)) {
        // Exact match for the mount point itself
        if (path === mount.mountPath) {
          return { fs: mount.fs, relativePath: "/" };
        }
        // Path is inside the mount point
        if (path[mount.mountPath.length] === "/") {
          const relativePath = path.slice(mount.mountPath.length);
          return { fs: mount.fs, relativePath: relativePath || "/" };
        }
      }
    }

    // Check for root mount as a fallback
    const rootMount = this.mounts.find((m) => m.mountPath === "/");
    if (rootMount) {
      return { fs: rootMount.fs, relativePath: path };
    }

    return null;
  }

  async stat(path: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }> {
    const resolved = this._resolvePath(path);
    if (!resolved) {
      throw new FsError(`ENOENT: no such file or directory, stat '${path}'`, "ENOENT");
    }
    return resolved.fs.stat(resolved.relativePath);
  }

  async readFile(path: string, options?: { encoding?: "utf8" }): Promise<string | Uint8Array | Buffer> {
    const resolved = this._resolvePath(path);
    if (!resolved) {
      throw new FsError(`ENOENT: no such file or directory, open '${path}'`, "ENOENT");
    }
    return resolved.fs.readFile(resolved.relativePath, options);
  }

  async writeFile(
    path: string,
    data: string | Uint8Array | Buffer,
    options?: { encoding?: "utf8"; mode: number }
  ): Promise<void> {
    const resolved = this._resolvePath(path);
    if (!resolved) {
      throw new FsError(`ENOENT: no such file or directory, open '${path}'`, "ENOENT");
    }
    return resolved.fs.writeFile(resolved.relativePath, data, options);
  }

  async unlink(path: string): Promise<void> {
    const resolved = this._resolvePath(path);
    if (!resolved) {
      throw new FsError(`ENOENT: no such file or directory, unlink '${path}'`, "ENOENT");
    }
    return resolved.fs.unlink(resolved.relativePath);
  }

  async mkdir(path: string, options?: { recursive?: boolean; mode: number }): Promise<string | void> {
    const resolved = this._resolvePath(path);
    if (!resolved) {
      throw new FsError(`ENOENT: no such file or directory, mkdir '${path}'`, "ENOENT");
    }
    return resolved.fs.mkdir(resolved.relativePath, options);
  }

  /**
   * Handles renaming, including across different mounted file systems.
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    const oldResolved = this._resolvePath(oldPath);
    const newResolved = this._resolvePath(newPath);

    if (!oldResolved || !newResolved) {
      throw new FsError(`ENOENT: no such file or directory, rename '${oldPath}' -> '${newPath}'`, "ENOENT");
    }

    // If rename is within the same file system, perform a native rename.
    if (oldResolved.fs === newResolved.fs) {
      return oldResolved.fs.rename(oldResolved.relativePath, newResolved.relativePath);
    }

    // Otherwise, perform a copy-and-delete across file systems.
    // Note: This is not atomic.
    const data = await oldResolved.fs.readFile(oldResolved.relativePath);
    await newResolved.fs.writeFile(newResolved.relativePath, data);
    await oldResolved.fs.unlink(oldResolved.relativePath);
  }

  /**
   * Reads directory contents, combining results from the underlying FS
   * and any mount points that are direct children of the path.
   */
  async readdir(path: string): Promise<
    (
      | string
      | Buffer
      | {
          name: string | Buffer;
          isDirectory: () => boolean;
          isFile: () => boolean;
        }
    )[]
  > {
    const resolved = this._resolvePath(path);
    let baseContents: (string | Buffer | { name: string | Buffer })[] = [];

    // 1. Get contents from the underlying file system, if one is mounted at the path.
    if (resolved) {
      try {
        // We cast here because we will normalize to string names later.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        baseContents = (await resolved.fs.readdir(resolved.relativePath)) as any[];
      } catch (e) {
        // If readdir fails, we might still have mount points inside, so we continue.
        // But if the error is not ENOENT, we should probably throw it.
        if ((e as FsError).code !== "ENOENT") {
          throw e;
        }
      }
    }

    // 2. Find other mounts that are direct children of this path.
    const childMounts = this.mounts
      .filter((mount) => {
        if (mount.mountPath === path) return false; // Not a child of itself
        const parentDir = path === "/" ? "/" : `${path}/`;
        if (!mount.mountPath.startsWith(parentDir)) return false;

        // Ensure it's a direct child, not a grandchild
        const relative = mount.mountPath.slice(parentDir.length);
        return !relative.includes("/");
      })
      .map((mount) => mount.mountPath.split("/").pop()!);

    // 3. Combine and deduplicate the results.
    const nameSet = new Set<string>();
    baseContents.forEach((item) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const name = typeof item === "string" ? item : (item as any).name.toString();
      nameSet.add(name);
    });
    childMounts.forEach((name) => nameSet.add(name));

    // The interface allows for string[], so we return that for simplicity.
    // A more complex implementation could return virtual Dirent objects.
    return Array.from(nameSet);
  }

  async rmdir(path: string, options?: { recursive?: boolean }) {
    const resolved = this._resolvePath(path);
    if (!resolved) {
      throw new FsError(`ENOENT: no such file or directory, rmdir '${path}'`, "ENOENT");
    }
    return resolved.fs.rmdir(resolved.relativePath, options);
  }
  async lstat(path: string) {
    //not bothering with symlinks...
    return this.stat(path);
  }
}
