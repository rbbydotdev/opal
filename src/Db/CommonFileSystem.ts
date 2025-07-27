import { NamespacedFs } from "@/Db/NamespacedFs";
import { AbsPath, encodePath, joinPath } from "@/lib/paths2";

export interface CommonFileSystem {
  readdir(path: string): Promise<
    (
      | string
      | Buffer<ArrayBufferLike>
      | {
          name: string | Buffer<ArrayBufferLike>;
          isDirectory: () => boolean;
          isFile: () => boolean;
        }
    )[]
  >;
  stat(path: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }>; // Exact type can vary based on implementation details.
  readFile(path: string, options?: { encoding?: "utf8" }): Promise<Uint8Array | Buffer | string>;
  mkdir(path: string, options?: { recursive?: boolean; mode: number }): Promise<string | void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  unlink(path: string): Promise<void>;
  writeFile(
    path: string,
    data: Uint8Array | Buffer | string,
    options?: { encoding?: "utf8"; mode: number }
  ): Promise<void>;

  rmdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  lstat(path: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }>; // Similar to stat, but for symbolic links

  symlink(target: string, path: string): Promise<void>;

  readlink(path: string): Promise<Buffer<ArrayBufferLike> | string | null>;
}

type OPFSFileSystem = CommonFileSystem & {
  rm: (path: string, options?: { force?: boolean; recursive?: boolean }) => Promise<void>;
};

export class OPFSNamespacedFs extends NamespacedFs {
  fs: OPFSFileSystem;
  constructor(fs: OPFSFileSystem, namespace: AbsPath | string) {
    super(fs, namespace);
    this.fs = fs;
  }

  tearDown(): Promise<void> {
    return this.fs.rm(encodePath(this.namespace), { recursive: true, force: true });
  }

  rm(path: string, options?: { force?: boolean; recursive?: boolean }) {
    return this.fs.rm(encodePath(joinPath(this.namespace, path)), options);
  }
  async symlink(_target: string, _path: string): Promise<void> {
    throw new Error("OPFS does not support symlinks");
  }
  async readlink(_path: string): Promise<Buffer<ArrayBufferLike> | string | null> {
    throw new Error("OPFS does not support readlink");
  }
}
