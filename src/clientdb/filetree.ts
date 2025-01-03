import { FsType } from "@/clientdb/Disk";
import { absPath } from "@/lib/paths";

export type TreeFile = {
  name: string;
  type: "file";
  path: string;
  depth: number;
};
export class FileTree {
  root: TreeDir = {
    name: "/",
    path: "/",
    type: "dir",
    children: [],
    depth: 0,
  };
  tree: TreeDir = this.root;
  constructor(private fs: FsType, public id: string) {}
  children = this.root.children;

  onReadyQueue: Array<(fileTree: this) => void> = [];
  onReady = (fn: () => void) => this.onReadyQueue.push(fn);
  flushQueue = () => {
    this.onReadyQueue.forEach((fn) => fn(this));
    this.onReadyQueue = [];
  };

  indexed = false;
  //poor mans queue for async indexing,
  indexedPromise: Promise<this> | null = null;
  // private resolve: typeof Promise.resolve;

  index = () => {
    this.root = {
      name: "/",
      path: "/",
      type: "dir",
      children: [],
      depth: 0,
    };
    if (this.indexedPromise) {
      return this.indexedPromise.then(() => {
        this.indexedPromise = this.buildNested().then(() => this);
      });
    }
    return (this.indexedPromise = this.buildNested().then(() => this));
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

  loadTree = () => {
    if (!this.indexedPromise) {
      return (this.indexedPromise = this.buildNested().then(() => this));
    } else {
      return this.indexedPromise;
    }
  };

  async getFirstFile() {
    await this.loadTree();
    let first = null;
    this.walk((file, _, exit) => {
      if (file.type === "file") {
        first = file;
        exit();
      }
    });
    return first;
  }

  private async buildNested(): Promise<TreeDir> {
    return (await this.build()) as TreeDir;
  }
  private async build() {
    await this.recurseTree(this.root.path, this.root.children, 0);
    this.indexed = true;
    return this.root;
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
