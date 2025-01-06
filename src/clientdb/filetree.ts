import { FsType } from "@/clientdb/Disk";
import { absPath } from "@/lib/paths";
import { Mutex } from "async-mutex";

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
  static INDEX = "index";
  static REMOTE_INDEX = "remoteindex";

  static EmptyFileTree = () =>
    ({
      name: "/",
      path: "/",
      type: "dir",
      children: [],
      depth: 0,
    } as TreeDir);

  initialIndex = false;
  root: TreeDir = FileTree.EmptyFileTree();
  dirs: TreeList = [];

  // private tree: TreeDir = this.root;
  constructor(private fs: FsType) {}
  private mutex = new Mutex();

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
    return this.index({ force: true });
  };
  index = async ({ force = false, tree = FileTree.EmptyFileTree() }: { force?: boolean; tree?: TreeDir } = {}) => {
    if (force || !this.initialIndex) {
      console.log("index");
      const release = await this.mutex.acquire();
      try {
        this.root = JSON.parse(JSON.stringify(tree));
        await this.recurseTree(this.root.path, this.root.children, 0);
        this.dirs = this.flatDirTree();
        this.initialIndex = true;
      } finally {
        release(); // Release the lock
      }
    }

    return this;
  };

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

  recurseTree = async (dir: string, parent: TreeNode[] = [], depth = 0, haltOnError = false) => {
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
