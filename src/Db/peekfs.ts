import { CommonFileSystem } from "@/Db/Disk";
import { absPath, AbsPath } from "@/lib/paths";

//peek fs is a small shared interface between the disk fs and the filetree
export abstract class PeekFs {
  abstract readdir(path: string): Promise<
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
  abstract stat(path: string): Promise<{
    isDirectory: () => boolean;
    isFile: () => boolean;
  }>;
}

//this allows us to use FileTree with a descriminated root, or namespaced root which feels virtually non existent
export class DescriminatedRootPeekFs extends PeekFs {
  constructor(private fs: CommonFileSystem, private root: AbsPath) {
    super();
  }
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
  > {
    return this.fs.readdir(this.root.join(path).encode());
  }
  stat(path: string): Promise<{
    isDirectory: () => boolean;
    isFile: () => boolean;
  }> {
    return this.fs.stat(this.root.join(path).encode());
  }
}

/*
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
}
*/

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
    return (await this.fs.readdir(this.namespace.join(path).encode())).map((entry) => {
      // if (typeof entry === "string" || Buffer.isBuffer(entry)) {
      //   console.log(">>", entry.slice(this.namespace.encode().length + 1));
      //   return entry.slice(this.namespace.encode().length + 1); // Remove the namespace prefix
      // }
      // if (typeof entry.name === "string") {
      //   entry.name = entry.name.slice(this.namespace.encode().length + 1);
      //   console.log(">> name ", entry.name.slice(this.namespace.encode().length + 1));
      // }
      return entry;
    });
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
  rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
    return this.fs.rm(this.namespace.join(path).encode(), options);
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
