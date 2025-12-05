import { CommonFileSystem } from "@/data/fs/FileSystemTypes";
import { isErrorWithCode } from "@/lib/errors/errors";
import { AbsPath, absPath, joinPath, relPath, stringifyEntry } from "@/lib/paths2";

function translateFs(
  fs: CommonFileSystem,
  translate: AbsPath | string | ((path: AbsPath | string) => AbsPath | string)
): CommonFileSystem {
  const newFs: CommonFileSystem = {} as CommonFileSystem;
  const translateFn =
    typeof translate === "function" ? translate : (path: AbsPath | string) => joinPath(absPath(translate), path);

  // Handle all methods that take a path as first argument
  for (const method of [
    "readdir",
    "stat",
    "readFile",
    "mkdir",
    "unlink",
    "writeFile",
    "rmdir",
    "lstat",
    "symlink",
    "readlink",
  ] as const) {
    const originalMethod = fs[method];
    if (originalMethod) {
      //@ts-ignore
      newFs[method] = (...args: any[]) => {
        args[0] = translateFn(args[0]);
        //@ts-ignore
        return originalMethod.call(fs, ...args);
      };
    }
  }

  // Special handling for rename which takes two path arguments
  newFs["rename"] = (oldPath: string, newPath: string) => {
    return fs.rename(translateFn(oldPath), translateFn(newPath));
  };

  return newFs;
}

export class TranslateFs implements CommonFileSystem {
  private translatedFs: CommonFileSystem;
  constructor(
    protected fs: CommonFileSystem,
    private translate: AbsPath | string | ((path: AbsPath | string) => AbsPath | string)
  ) {
    this.translatedFs = translateFs(this.fs, this.translate);
  }

  async readdir(path: string): Promise<
    (
      | string
      | Buffer<ArrayBufferLike>
      | {
          name: string | Buffer<ArrayBufferLike>;
          isDirectory: () => boolean;
          isFile: () => boolean;
        }
    )[]
  > {
    return this.translatedFs.readdir(path);
  }

  async stat(path: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }> {
    return this.translatedFs.stat(path);
  }

  async readFile(path: string, options?: { encoding?: "utf8" }): Promise<Uint8Array | Buffer | string> {
    return this.translatedFs.readFile(path, options);
  }

  async mkdir(path: string, options?: { recursive?: boolean; mode: number }): Promise<string | void> {
    return this.translatedFs.mkdir(path, options);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    return this.translatedFs.rename(oldPath, newPath);
  }

  async unlink(path: string): Promise<void> {
    return this.translatedFs.unlink(path);
  }

  async writeFile(
    path: string,
    data: Uint8Array | Buffer | string,
    options?: { encoding?: "utf8"; mode: number }
  ): Promise<void> {
    return this.translatedFs.writeFile(path, data, options);
  }

  async rmdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    return this.translatedFs.rmdir(path, options);
  }

  async lstat(path: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }> {
    return this.translatedFs.lstat(path);
  }

  async symlink(target: string, path: string): Promise<void> {
    return this.translatedFs.symlink(target, path);
  }

  async readlink(path: string): Promise<Buffer<ArrayBufferLike> | string | null> {
    return this.translatedFs.readlink(path);
  }
}

export class NamespacedFs2 extends TranslateFs {
  namespace: AbsPath;

  constructor(fs: CommonFileSystem, namespace: AbsPath | string) {
    const normalizedNamespace = typeof namespace === "string" ? absPath(namespace) : namespace;
    super(fs, relPath(normalizedNamespace));
    this.namespace = normalizedNamespace;
  }

  init() {
    return this.fs.mkdir(relPath(this.namespace)).catch((e) => {
      if (!isErrorWithCode(e, "EEXIST")) throw e;
    });
  }
}

interface Mount {
  mountPath: AbsPath;
  filesystem: CommonFileSystem;
}

export class MountingFS implements CommonFileSystem {
  private mounts: Mount[] = [];
  private rootFs?: CommonFileSystem;

  constructor(rootFs?: CommonFileSystem) {
    this.rootFs = rootFs;
  }

  mount(mountPath: AbsPath | string, filesystem: CommonFileSystem) {
    const normalizedMountPath = typeof mountPath === "string" ? absPath(mountPath) : mountPath;

    // Remove existing mount at the same path
    this.mounts = this.mounts.filter((mount) => mount.mountPath !== normalizedMountPath);

    // Add new mount
    this.mounts.push({ mountPath: normalizedMountPath, filesystem });

    // Sort by path length (descending) so longer paths are matched first
    this.mounts.sort((a, b) => b.mountPath.length - a.mountPath.length);
  }

  unmount(mountPath: AbsPath | string) {
    const normalizedMountPath = typeof mountPath === "string" ? absPath(mountPath) : mountPath;
    this.mounts = this.mounts.filter((mount) => mount.mountPath !== normalizedMountPath);
  }

  private findMount(path: string): { filesystem: CommonFileSystem; relativePath: string } {
    const normalizedPath = absPath(path);

    // Check for mounted filesystems (longest paths first)
    for (const mount of this.mounts) {
      if (normalizedPath.startsWith(mount.mountPath)) {
        // Remove mount path prefix to get relative path for the mounted filesystem
        let relativePath: string;
        if (normalizedPath === mount.mountPath) {
          // Accessing the mount point itself
          relativePath = "/";
        } else {
          // Remove the mount prefix and ensure it starts with /
          relativePath = absPath(normalizedPath.slice(mount.mountPath.length));
        }
        return { filesystem: mount.filesystem, relativePath };
      }
    }

    // Fall back to root filesystem
    if (this.rootFs) {
      return { filesystem: this.rootFs, relativePath: path };
    }

    throw new Error(`No filesystem mounted for path: ${path}`);
  }

  async readdir(path: string): Promise<
    (
      | string
      | Buffer<ArrayBufferLike>
      | {
          name: string | Buffer<ArrayBufferLike>;
          isDirectory: () => boolean;
          isFile: () => boolean;
        }
    )[]
  > {
    const { filesystem, relativePath } = this.findMount(path);
    return filesystem.readdir(relativePath);
  }

  async stat(path: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }> {
    const { filesystem, relativePath } = this.findMount(path);
    return filesystem.stat(relativePath);
  }

  async readFile(path: string, options?: { encoding?: "utf8" }): Promise<Uint8Array | Buffer | string> {
    const { filesystem, relativePath } = this.findMount(path);
    return filesystem.readFile(relativePath, options);
  }

  async mkdir(path: string, options?: { recursive?: boolean; mode: number }): Promise<string | void> {
    const { filesystem, relativePath } = this.findMount(path);
    return filesystem.mkdir(relativePath, options);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const oldMount = this.findMount(oldPath);
    const newMount = this.findMount(newPath);

    if (oldMount.filesystem === newMount.filesystem) {
      // Same filesystem - use native rename
      return oldMount.filesystem.rename(oldMount.relativePath, newMount.relativePath);
    } else {
      // Cross-mount rename: copy + delete
      try {
        // First, check if source exists by attempting to stat it
        await oldMount.filesystem.stat(oldMount.relativePath);

        // Check if source is a directory - we need to handle this recursively
        const sourceStats = await oldMount.filesystem.stat(oldMount.relativePath);
        if (sourceStats.isDirectory()) {
          await this.copyDirectoryRecursive(oldMount, newMount);
        } else {
          // Copy file
          const data = await oldMount.filesystem.readFile(oldMount.relativePath);
          await newMount.filesystem.writeFile(newMount.relativePath, data);
        }

        // Delete source after successful copy
        if (sourceStats.isDirectory()) {
          await oldMount.filesystem.rmdir(oldMount.relativePath, { recursive: true });
        } else {
          await oldMount.filesystem.unlink(oldMount.relativePath);
        }
      } catch (error) {
        // If copy+delete fails, try to clean up any partial copy
        try {
          const targetStats = await newMount.filesystem.stat(newMount.relativePath);
          if (targetStats.isDirectory()) {
            await newMount.filesystem.rmdir(newMount.relativePath, { recursive: true });
          } else {
            await newMount.filesystem.unlink(newMount.relativePath);
          }
        } catch {
          // Ignore cleanup errors
        }
        throw error;
      }
    }
  }

  private async copyDirectoryRecursive(
    sourceMount: { filesystem: CommonFileSystem; relativePath: string },
    targetMount: { filesystem: CommonFileSystem; relativePath: string }
  ): Promise<void> {
    // Create target directory
    await targetMount.filesystem.mkdir(targetMount.relativePath, { recursive: true, mode: 0o755 });

    // Read source directory contents
    const entries = await sourceMount.filesystem.readdir(sourceMount.relativePath);

    for (const entry of entries) {
      const entryName = stringifyEntry(entry);
      const sourcePath =
        sourceMount.relativePath === "/" ? `/${entryName}` : `${sourceMount.relativePath}/${entryName}`;
      const targetPath =
        targetMount.relativePath === "/" ? `/${entryName}` : `${targetMount.relativePath}/${entryName}`;

      const entryStats = await sourceMount.filesystem.stat(sourcePath);

      if (entryStats.isDirectory()) {
        // Recursively copy subdirectory
        await this.copyDirectoryRecursive(
          { filesystem: sourceMount.filesystem, relativePath: sourcePath },
          { filesystem: targetMount.filesystem, relativePath: targetPath }
        );
      } else {
        // Copy file
        const data = await sourceMount.filesystem.readFile(sourcePath);
        await targetMount.filesystem.writeFile(targetPath, data);
      }
    }
  }

  async unlink(path: string): Promise<void> {
    const { filesystem, relativePath } = this.findMount(path);
    return filesystem.unlink(relativePath);
  }

  async writeFile(
    path: string,
    data: Uint8Array | Buffer | string,
    options?: { encoding?: "utf8"; mode: number }
  ): Promise<void> {
    const { filesystem, relativePath } = this.findMount(path);
    return filesystem.writeFile(relativePath, data, options);
  }

  async rmdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    const { filesystem, relativePath } = this.findMount(path);
    return filesystem.rmdir(relativePath, options);
  }

  async lstat(path: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }> {
    const { filesystem, relativePath } = this.findMount(path);
    return filesystem.lstat(relativePath);
  }

  async symlink(target: string, path: string): Promise<void> {
    const { filesystem, relativePath } = this.findMount(path);
    return filesystem.symlink(target, relativePath);
  }

  async readlink(path: string): Promise<Buffer<ArrayBufferLike> | string | null> {
    const { filesystem, relativePath } = this.findMount(path);
    return filesystem.readlink(relativePath);
  }

  // Utility methods
  getMounts(): Array<{ mountPath: AbsPath; filesystem: CommonFileSystem }> {
    return [...this.mounts];
  }

  isMounted(path: AbsPath | string): boolean {
    const normalizedPath = typeof path === "string" ? absPath(path) : path;
    return this.mounts.some((mount) => mount.mountPath === normalizedPath);
  }
}
