import { FileSystem } from "@/clientdb/Disk";
import { absPath } from "@/lib/paths";
import { Mutex } from "async-mutex";

export type TreeNode = TreeDir | TreeFile;

export type TreeList = Array<string>;

export type TreeDir = {
  children: Array<TreeNode>;
  name: string;
  type: "dir";
  basename: string;
  dirname: string;
  path: string;
  depth: number;
};

export type TreeDirRoot = TreeDir & { __root: boolean };

export type TreeFile = {
  name: string;
  type: "file";
  dirname: string;
  basename: string;
  path: string;
  depth: number;
};

export class FileTree {
  static EmptyFileTree = () =>
    ({
      __root: true,
      name: "/",
      path: "/",
      dirname: "/",
      basename: "/",
      type: "dir",
      children: [],
      depth: 0,
    } satisfies TreeDirRoot);

  initialIndex = false;
  root: TreeDir = FileTree.EmptyFileTree();
  dirs: TreeList = [];
  static SKIPPED: "skipped";
  static INDEXED: "index";

  // private tree: TreeDir = this.root;
  constructor(private fs: FileSystem) {}
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

  forceIndex = () => {
    return this.index({ force: true });
  };
  index = async ({ force = false, tree = FileTree.EmptyFileTree() }: { force?: boolean; tree?: TreeDirRoot } = {}) => {
    if (force || !this.initialIndex) {
      console.debug("Indexing file tree...");
      const release = await this.mutex.acquire();
      console.debug("Acquired unlock");
      try {
        this.root = tree;
        await this.recurseTree(this.root.path, this.root.children, 0);
        this.dirs = this.flatDirTree();
        this.initialIndex = true;
      } finally {
        release(); // Release the lock
      }
      console.debug("Indexing complete");
      console.debug(this.root.children.map((c) => c.name).join(", "));
      return FileTree.INDEXED;
    }
    console.debug("Indexing skipped");
    return FileTree.SKIPPED;
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
      await Promise.all(
        entries.map(async (entry) => {
          const fullPath = absPath(dir).join(entry.toString()).str;
          const stat = await this.fs.promises.stat(fullPath);
          let nextParent = null;
          let treeEntry: TreeDir | TreeFile | string = "";

          if (stat.isDirectory()) {
            treeEntry = {
              name: entry.toString(),
              depth,
              type: "dir",
              path: fullPath,
              children: [],
              dirname: absPath(fullPath).dirname(),
              basename: absPath(fullPath).basename(),
            };
            nextParent = treeEntry.children;
            await this.recurseTree(fullPath, nextParent, depth + 1, haltOnError);
          } else {
            treeEntry = {
              name: entry.toString(),
              depth,
              type: "file",
              path: fullPath,
              dirname: absPath(fullPath).dirname(),
              basename: absPath(fullPath).basename(),
            };
          }
          parent.push(treeEntry);
        })
      );
    } catch (err) {
      console.error(`Error reading ${dir}:`, err);
      if (haltOnError) {
        throw err;
      }
    }
  };
}
