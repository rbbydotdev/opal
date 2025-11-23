import { CommonFileSystem } from "@/data/FileSystemTypes";
import { isErrorWithCode } from "@/lib/errors";
import { AbsPath, absPath, joinPath, relPath, resolveFromRoot } from "@/lib/paths2";

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
  
  constructor(
    fs: CommonFileSystem,
    namespace: AbsPath | string
  ) {
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
    this.mounts = this.mounts.filter(mount => mount.mountPath !== normalizedMountPath);
    
    // Add new mount
    this.mounts.push({ mountPath: normalizedMountPath, filesystem });
    
    // Sort by path length (descending) so longer paths are matched first
    this.mounts.sort((a, b) => b.mountPath.length - a.mountPath.length);
  }

  unmount(mountPath: AbsPath | string) {
    const normalizedMountPath = typeof mountPath === "string" ? absPath(mountPath) : mountPath;
    this.mounts = this.mounts.filter(mount => mount.mountPath !== normalizedMountPath);
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
          relativePath = normalizedPath.slice(mount.mountPath.length);
          if (!relativePath.startsWith("/")) {
            relativePath = "/" + relativePath;
          }
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
    
    // Check if both paths are on the same filesystem
    if (oldMount.filesystem !== newMount.filesystem) {
      throw new Error("Cannot rename across different mounted filesystems");
    }
    
    return oldMount.filesystem.rename(oldMount.relativePath, newMount.relativePath);
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
    return this.mounts.some(mount => mount.mountPath === normalizedPath);
  }
}
