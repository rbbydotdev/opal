import { CommonFileSystem } from "@/Db/Disk";
import { absPath, AbsPath } from "@/lib/paths";
import { FsaNodeFs } from "memfs/lib/fsa-to-node";
import path from "path";

//peek fs is a small shared interface between the disk fs and the filetree

export class NamespacedFs implements CommonFileSystem {
  namespace: AbsPath;
  constructor(protected fs: CommonFileSystem, namespace: AbsPath | string) {
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
    console.log(`Writing file to namespaced path: ${this.namespace.join(path).encode()}`);
    return this.fs.writeFile(this.namespace.join(path).encode(), data, options);
  }
}

export class PatchedOPFS extends FsaNodeFs {
  constructor(...args: ConstructorParameters<typeof FsaNodeFs>) {
    super(...args);
    this.promises.unlink = async (path: string) => {
      return this.promises.rm.bind(this.promises)(path, { recursive: true, force: true }); // Monkey patch to add unlink method
    };
    const originalRename = this.promises.rename.bind(this.promises);
    this.promises.rename = async (oldPath: string, newPath: string) => {
      const stat = await this.promises.stat(oldPath);
      if (!stat.isDirectory()) {
        return await originalRename(oldPath, newPath);
      }
      const walk = async (dir: string) => {
        const targetDir = dir.replace(oldPath, newPath);
        await this.promises.mkdir(targetDir, { recursive: true, mode: 0o777 });
        const entries = (await this.promises.readdir(dir)).map((e) => String(e));
        for (const entry of entries) {
          const entryPath = path.join(dir, entry);
          const stat = await this.promises.stat(entryPath);
          if (stat.isDirectory()) {
            await walk(entryPath);
          } else {
            const targetFile = entryPath.replace(oldPath, newPath);
            await this.promises.writeFile(targetFile, await this.promises.readFile(entryPath));
          }
        }
      };
      await walk(oldPath);
      await this.promises.rm(oldPath, { recursive: true, force: true });
    };
  }
}
