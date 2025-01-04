import { FsType } from "@/clientdb/Disk";
import { absPath } from "@/lib/paths";
import Emittery from "emittery";

export type TreeFile = {
  name: string;
  type: "file";
  path: string;
  depth: number;
};

export const EmptyFileTree: TreeDir = {
  name: "/",
  path: "/",
  type: "dir",
  children: [],
  depth: 0,
};

// export type EmptyFileTreeType = typeof EmptyFileTree;
export class FileTree {
  root: TreeDir = EmptyFileTree;
  // private tree: TreeDir = this.root;
  constructor(private fs: FsType, public id: string) {}
  children = this.root.children;

  private onIndexedQueue: Array<(root: typeof this.root, fileTree: this) => void> = [];
  // private onIndexed = (fn: () => void) => this.onIndexedQueue.push(fn);
  flushQueue = () => {
    while (this.onIndexedQueue.length) {
      this.onIndexedQueue.shift()!(this.root, this);
    }
  };
  private emitter = new Emittery();

  indexed = false;
  //poor mans queue for async indexing,
  // indexedPromise: Promise<this> | null = null;
  // private resolve: typeof Promise.resolve;

  reIndex = () => {
    this.root = EmptyFileTree;
    this.indexed = false;
    return this.index();
  };

  flatDirTree = () => {
    const flat: TreeList = [];
    this.walk((node) => {
      if (node.type === "dir") {
        flat.push(node.path);
      }
    });
    return flat;
  };

  index = async () => {
    if (this.indexed) return this;
    this.indexed = true;
    await this.buildNested();
    this.flushQueue();
    this.emitter.emit("index", this);
    await new Promise((rs) => queueMicrotask(() => rs(null)));
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

  // private async buildNested(): Promise<TreeDir> {
  //   return (await this.build()) as TreeDir;
  // }
  private async buildNested() {
    // while (this.root.children.length) {
    //   this.root.children.pop();
    // }
    await this.recurseTree(this.root.path, this.root.children, 0);
    return this.root;
  }

  watch(callback: (fileTree: this) => void) {
    return this.emitter.on("index", () => callback(this));
  }

  teardown() {
    this.emitter.clearListeners();
    this.onIndexedQueue.length = 0;
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

export type TreeNode = TreeDir | TreeFile;

export type TreeList = Array<string>;

export type TreeDir = {
  children: Array<TreeNode>;
  name: string;
  type: "dir";
  path: string;
  depth: number;
};
