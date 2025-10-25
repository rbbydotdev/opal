import { NamespacedFs } from "@/Db/NamespacedFs";
import { isErrorWithCode } from "@/lib/errors";
import { AbsPath, encodePath, joinPath } from "@/lib/paths2";
import { relPath } from "../lib/paths2";
import { CommonFileSystem } from "./FileSystemTypes";


type OPFSFileSystem = CommonFileSystem & {
  rm: (path: string, options?: { force?: boolean; recursive?: boolean }) => Promise<void>;
};

export class OPFSNamespacedFs extends NamespacedFs {
  fs: OPFSFileSystem;
  init() {
    return this.fs.mkdir(relPath(this.namespace)).catch((e) => {
      if (!isErrorWithCode(e, "EEXIST")) throw e;
    });
  }
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
