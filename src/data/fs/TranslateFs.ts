import { CommonFileSystem } from "@/data/FileSystemTypes";
import { isErrorWithCode } from "@/lib/errors";
import { AbsPath, absPath, joinPath, relPath } from "@/lib/paths2";

function translateFs(
  fs: CommonFileSystem,
  translate: AbsPath | string | ((path: AbsPath | string) => AbsPath | string)
): CommonFileSystem {
  const newFs: CommonFileSystem = {} as CommonFileSystem;
  for (const method of [
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
    const translateFn =
      typeof translate === "function" ? translate : (path: AbsPath | string) => joinPath(absPath(translate), path);
    const originalMethod = fs[method].bind(fs);
    //@ts-ignore
    newFs[method] = (...args: any[]) => {
      args[0] = translateFn(args[0]);
      //@ts-ignore
      return originalMethod(...args);
    };
    newFs["rename"] = (oldPath: string, newPath: string) => {
      return fs.rename(translateFn(oldPath), translateFn(newPath));
    };
  }
  return newFs;
}

export class TranslateFs {
  private translatedFs: CommonFileSystem;
  constructor(
    protected fs: CommonFileSystem,
    private translate: AbsPath | string | ((path: AbsPath | string) => AbsPath | string)
  ) {
    this.translatedFs = translateFs(this.fs, this.translate);
    for (const method of Object.keys(this.translatedFs)) {
      //@ts-ignore
      this[method] = this.translatedFs[method].bind(this.translatedFs);
    }
  }

  //@ts-ignore
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
  //@ts-ignore
  stat(path: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }>; // Exact type can vary based on implementation details.
  //@ts-ignore
  readFile(path: string, options?: { encoding?: "utf8" }): Promise<Uint8Array | Buffer | string>;
  //@ts-ignore
  mkdir(path: string, options?: { recursive?: boolean; mode: number }): Promise<string | void>;
  //@ts-ignore
  rename(oldPath: string, newPath: string): Promise<void>;
  //@ts-ignore
  unlink(path: string): Promise<void>;
  //@ts-ignore
  writeFile(
    path: string,
    data: Uint8Array | Buffer | string,
    options?: { encoding?: "utf8"; mode: number }
  ): Promise<void>;

  //@ts-ignore
  rmdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  //@ts-ignore
  lstat(path: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }>; // Similar to stat, but for symbolic links

  //@ts-ignore
  symlink(target: string, path: string): Promise<void>;

  //@ts-ignore
  readlink(path: string): Promise<Buffer<ArrayBufferLike> | string | null>;
}

export class NamespacedFs2 extends TranslateFs {
  constructor(
    fs: CommonFileSystem,
    readonly namespace: string
  ) {
    super(fs, relPath(namespace));
  }

  init() {
    return this.fs.mkdir(relPath(this.namespace)).catch((e) => {
      if (!isErrorWithCode(e, "EEXIST")) throw e;
    });
  }
}
