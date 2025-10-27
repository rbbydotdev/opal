import {
  AbsPath,
  RelPath,
  absPath,
  basename,
  equals,
  isAbsPath,
  isAncestor,
  joinPath,
  relPath,
  stringifyEntry,
} from "@/lib/paths2";
import { CommonFileSystem } from "../FileSystemTypes";

export type HideRule = { type: "file"; path: string } | { type: "dir"; path: RelPath | AbsPath };

function createENOENTError(path: string, syscall: string): Error {
  const error = new Error(`ENOENT: no such file or directory, ${syscall} '${path}'`) as any;
  error.code = "ENOENT";
  error.errno = -2;
  error.syscall = syscall;
  error.path = path;
  return error;
}

export class HideFs implements CommonFileSystem {
  private fs: CommonFileSystem;
  private hideRules: HideRule[];

  constructor(fs: CommonFileSystem, hideRules: Array<HideRule | AbsPath | RelPath> = []) {
    this.fs = fs;
    this.hideRules = hideRules.map((rule) => {
      if (typeof rule === "string") {
        // Determine if it's an absolute path or relative path
        if (isAbsPath(rule)) {
          return { type: "dir", path: rule } as HideRule;
        } else {
          return { type: "dir", path: rule } as HideRule;
        }
      }
      return rule;
    });
  }

  private shouldHide(path: string, isDirectory: boolean = false): boolean {
    const pathAbs = absPath(path);
    const pathBase = basename(path);

    for (const rule of this.hideRules) {
      if (rule.type === "file" && !isDirectory) {
        // Check exact filename match
        if (equals(pathBase, relPath(rule.path))) {
          return true;
        }
        // Check exact path match
        if (path === rule.path) {
          return true;
        }
      } else if (rule.type === "dir") {
        const rulePath = rule.path;

        if (isAbsPath(rulePath)) {
          // For absolute paths, use isAncestor helper
          if (isAncestor({ child: pathAbs, parent: rulePath })) {
            return true;
          }
        } else {
          // For relative paths, check if basename matches or if it's an ancestor
          if (equals(pathBase, relPath(rulePath))) {
            return true;
          }
          // Check if the relative path is contained within the current path
          if (isAncestor({ child: pathAbs, parent: absPath(rulePath) })) {
            return true;
          }
        }
      }
    }

    return false;
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
    const entries = await this.fs.readdir(path);

    return entries.filter((entry) => {
      const entryName = stringifyEntry(entry);
      const fullPath = joinPath(absPath(path), entryName);

      // Check if this is a directory entry with metadata
      const isDirectory =
        typeof entry === "object" && entry !== null && "isDirectory" in entry ? entry.isDirectory() : false;

      return !this.shouldHide(String(fullPath), isDirectory);
    });
  }

  async stat(path: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }> {
    if (this.shouldHide(path)) {
      throw createENOENTError(path, "stat");
    }
    return this.fs.stat(path);
  }

  async lstat(path: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }> {
    if (this.shouldHide(path)) {
      const error = new Error(`ENOENT: no such file or directory, lstat '${path}'`) as any;
      error.code = "ENOENT";
      error.errno = -2;
      error.syscall = "lstat";
      error.path = path;
      throw error;
    }
    return this.fs.lstat(path);
  }

  async readFile(path: string, options?: { encoding?: "utf8" }): Promise<Uint8Array | Buffer | string> {
    if (this.shouldHide(path)) {
      const error = new Error(`ENOENT: no such file or directory, open '${path}'`) as any;
      error.code = "ENOENT";
      error.errno = -2;
      error.syscall = "open";
      error.path = path;
      throw error;
    }
    return this.fs.readFile(path, options);
  }

  // Pass-through methods for operations that don't need hiding logic
  async mkdir(path: string, options?: { recursive?: boolean; mode: number }): Promise<string | void> {
    return this.fs.mkdir(path, options);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    return this.fs.rename(oldPath, newPath);
  }

  async unlink(path: string): Promise<void> {
    return this.fs.unlink(path);
  }

  async writeFile(
    path: string,
    data: Uint8Array | Buffer | string,
    options?: { encoding?: "utf8"; mode: number }
  ): Promise<void> {
    return this.fs.writeFile(path, data, options);
  }

  async rmdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    return this.fs.rmdir(path, options);
  }

  async symlink(target: string, path: string): Promise<void> {
    return this.fs.symlink(target, path);
  }

  async readlink(path: string): Promise<Buffer<ArrayBufferLike> | string | null> {
    if (this.shouldHide(path)) {
      const error = new Error(`ENOENT: no such file or directory, readlink '${path}'`) as any;
      error.code = "ENOENT";
      error.errno = -2;
      error.syscall = "readlink";
      error.path = path;
      throw error;
    }
    return this.fs.readlink(path);
  }
}
