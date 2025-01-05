import { FsType } from "@/clientdb/Disk";
import { ChannelEmittery } from "@/lib/channel";
import { absPath } from "@/lib/paths";
import { Mutex } from "async-mutex";
import Emittery from "emittery";

export type TreeNode = TreeDir | TreeFile;

export type TreeList = Array<string>;

export type TreeDir = {
  children: Array<TreeNode>;
  name: string;
  type: "dir";
  path: string;
  depth: number;
};

export type TreeFile = {
  name: string;
  type: "file";
  path: string;
  depth: number;
};

// export type EmptyFileTreeType = typeof EmptyFileTree;
export class FileTree {
  static LocalIndex = "LocalIndex";
  static EmptyFileTree = () =>
    ({
      name: "/",
      path: "/",
      type: "dir",
      children: [],
      depth: 0,
    } as TreeDir);

  private initialIndex = false;
  root: TreeDir = FileTree.EmptyFileTree();
  // private tree: TreeDir = this.root;
  constructor(private fs: FsType, public id: string) {
    this.index();
  }

  private emitter = new Emittery();
  private mutex = new Mutex();
  private currentIndexId: number = 0;

  getRootTree() {
    return this.root;
  }

  flatDirTree = () => {
    const flat: TreeList = [];
    this.walk((node) => {
      if (node.type === "dir") {
        flat.push(node.path);
      }
    });
    return flat;
  };

  reIndex = () => {
    return this.index(true);
  };
  index = async (force: boolean = false) => {
    if (force || !this.initialIndex) {
      // Use the mutex to ensure only one index operation is happening at a time
      const release = await this.mutex.acquire();
      try {
        this.root = FileTree.EmptyFileTree();
        await this.recurseTree(this.root.path, this.root.children, 0);
        this.initialIndex = true;
        this.currentIndexId++;
      } finally {
        release(); // Release the lock
      }
      this.emitter.emit(FileTree.LocalIndex, this.currentIndexId);
    }
    return this;
  };

  async getFirstFile(): Promise<TreeFile | null> {
    await this.index();
    let first = null;
    this.walk((file, _, exit) => {
      if (file.type === "file") {
        first = file;
        exit();
      }
    });
    return first;
  }

  onInitialIndex(callback: () => void) {
    if (this.initialIndex) {
      callback();
    } else {
      this.emitter.once("index").then(() => {
        callback();
      });
    }
  }

  watch(callback: (fileTree: TreeDir, indexId: number) => void) {
    let lastHandledIndexId = -1;
    return this.emitter.on("index", (indexId: number) => {
      if (indexId !== lastHandledIndexId) {
        lastHandledIndexId = indexId;
        callback(this.root, indexId);
      }
    });
  }

  teardown() {
    this.emitter.clearListeners();
  }

  walk(
    cb: (node: TreeNode, depth: number, exit: () => void) => void,
    node: TreeNode = this.root,
    depth = 0,
    status = { exit: false }
  ) {
    const exit = () => (status.exit = true);
    cb(node, depth, exit);
    for (const childNode of (node as TreeDir).children ?? []) {
      if (status.exit) break;
      this.walk(cb, childNode, depth + 1, status);
    }
  }

  private recurseTree = async (dir: string, parent: TreeNode[] = [], depth = 0, haltOnError = false) => {
    try {
      const entries = await this.fs.promises.readdir(dir);
      for (const entry of entries) {
        const fullPath = absPath(dir).join(entry.toString()).str;
        const stat = await this.fs.promises.stat(fullPath);
        let nextParent = null;
        let treeEntry: TreeDir | TreeFile | string = "";

        if (stat.isDirectory()) {
          treeEntry = { name: entry.toString(), depth, type: "dir", path: fullPath, children: [] };
          nextParent = treeEntry.children;
          await this.recurseTree(fullPath, nextParent, depth + 1, haltOnError);
        } else {
          treeEntry = {
            name: entry.toString(),
            depth,
            type: "file",
            path: fullPath,
          };
        }
        parent.push(treeEntry);
      }
    } catch (err) {
      console.error(`Error reading ${dir}:`, err);
      if (haltOnError) {
        throw err;
      }
    }
  };
}
