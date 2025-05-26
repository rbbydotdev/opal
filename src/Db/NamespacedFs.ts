import { CommonFileSystem } from "@/Db/Disk";
import { absPath, AbsPath } from "@/lib/paths";

//peek fs is a small shared interface between the disk fs and the filetree
export class NamespacedFs implements CommonFileSystem {
  namespace: AbsPath;
  constructor(private fs: CommonFileSystem, namespace: AbsPath | string) {
    if (typeof namespace === "string") {
      this.namespace = absPath(AbsPath.decode(namespace));
    } else {
      this.namespace = namespace;
    }
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
    return this.fs.readdir(this.namespace.join(path).encode());
  }

  stat(path: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }> {
    return this.fs.stat(this.namespace.join(path).encode());
  }
  readFile(path: string, options?: { encoding?: "utf8" }): Promise<Uint8Array | Buffer | string> {
    return this.fs.readFile(this.namespace.join(path).encode(), options);
  }
  mkdir(path: string, options?: { recursive?: boolean; mode: number }): Promise<string | void> {
    return this.fs.mkdir(this.namespace.join(path).encode(), options);
  }
  rename(oldPath: string, newPath: string): Promise<void> {
    return this.fs.rename(this.namespace.join(oldPath).encode(), this.namespace.join(newPath).encode());
  }
  unlink(path: string): Promise<void> {
    return this.fs.unlink(this.namespace.join(path).encode());
  }
  writeFile(
    path: string,
    data: Uint8Array | Buffer | string,
    options?: { encoding?: "utf8"; mode: number }
  ): Promise<void> {
    console.log(path, data.length);
    return this.fs.writeFile(this.namespace.join(path).encode(), data, options);
  }
}
