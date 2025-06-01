import { CommonFileSystem } from "@/Db/Disk";
import { AbsolutePath2, absPath, decodePath, encodePath, joinPath } from "@/lib/paths2";
import { FsaNodeFs } from "memfs/lib/fsa-to-node";
import path from "path";

export class NamespacedFs implements CommonFileSystem {
  namespace: AbsolutePath2;
  constructor(protected fs: CommonFileSystem, namespace: AbsolutePath2 | string) {
    if (typeof namespace === "string") {
      this.namespace = absPath(decodePath(namespace));
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
    return this.fs.readdir(encodePath(joinPath(this.namespace, path)));
  }

  stat(path: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }> {
    return this.fs.stat(encodePath(joinPath(this.namespace, path)));
  }
  readFile(path: string, options?: { encoding?: "utf8" }): Promise<Uint8Array | Buffer | string> {
    return this.fs.readFile(encodePath(joinPath(this.namespace, path)), options);
  }
  mkdir(path: string, options?: { recursive?: boolean; mode: number }): Promise<string | void> {
    return this.fs.mkdir(encodePath(joinPath(this.namespace, path)), options);
  }
  rename(oldPath: string, newPath: string): Promise<void> {
    return this.fs.rename(encodePath(joinPath(this.namespace, oldPath)), encodePath(joinPath(this.namespace, newPath)));
  }
  unlink(path: string): Promise<void> {
    return this.fs.unlink(encodePath(joinPath(this.namespace, path)));
  }
  writeFile(
    path: string,
    data: Uint8Array | Buffer | string,
    options?: { encoding?: "utf8"; mode: number }
  ): Promise<void> {
    return this.fs.writeFile(encodePath(joinPath(this.namespace, path)), data, options);
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
