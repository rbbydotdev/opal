import { FsType } from "@/clientdb/Disk";
import { absPath } from "@/lib/paths";
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
  static EmptyFileTree = () =>
    ({
      name: "/",
      path: "/",
      type: "dir",
      children: [],
      depth: 0,
    } as TreeDir);

  root: TreeDir = FileTree.EmptyFileTree();
  // private tree: TreeDir = this.root;
  constructor(private fs: FsType, public id: string) {
    this.index();
  }
  private emitter = new Emittery();

  initialIndex = false;

  private indexQueue: ((...a: any[]) => void)[] = [];

  private locked = false;

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
    if (!force && this.initialIndex) {
      this.emitter.emit("index");
      return this;
    }
    if (this.locked) {
      await new Promise((resolve) => this.indexQueue.push(resolve));
    }
    this.locked = true;
    this.root = FileTree.EmptyFileTree();
    await this.recurseTree(this.root.path, this.root.children, 0);
    while (this.indexQueue.length) {
      (this.indexQueue.shift() || (() => {}))();
    }
    this.initialIndex = true;
    this.emitter.emit("index");
    this.locked = false;
    return this;
  };

  async getFirstFile(): Promise<TreeFile | null> {
    let first = null;
    this.walk((file, _, exit) => {
      if (file.type === "file") {
        first = file;
        exit();
      }
    });
    return first;
  }

  watch(callback: (fileTree: TreeDir) => void) {
    return this.emitter.on("index", () => callback(this.root));
  }

  teardown() {
    this.emitter.clearListeners();
    this.indexQueue.length = 0;
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
