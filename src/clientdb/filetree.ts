import { FileSystem } from "@/clientdb/Disk";
import { AbsPath, absPath, relPath, RelPath } from "@/lib/paths";
import { Mutex } from "async-mutex";

export class TreeNode {
  name: RelPath;
  type: "dir" | "file";
  dirname: AbsPath;
  basename: RelPath;
  path: AbsPath;
  depth: number;

  constructor({
    name,
    type,
    dirname,
    basename,
    path,
    depth,
  }: {
    name: RelPath;
    type: "dir" | "file";
    dirname: AbsPath;
    basename: RelPath;
    path: AbsPath;
    depth: number;
  }) {
    this.name = typeof name === "string" ? relPath(name) : name;
    this.type = type;
    this.dirname = typeof dirname === "string" ? absPath(dirname) : dirname;
    this.basename = typeof basename === "string" ? relPath(basename) : basename;
    this.path = typeof path === "string" ? absPath(path) : path;
    this.depth = depth;
  }

  toJSON(): {
    name: string;
    type: "dir" | "file";
    dirname: string;
    basename: string;
    path: string;
    depth: number;
  } {
    return {
      name: this.name.str,
      type: this.type,
      dirname: this.dirname.str,
      basename: this.basename.str,
      path: this.path.str,
      depth: this.depth,
    };
  }
}

export class TreeDir extends TreeNode {
  children: Array<TreeNode>;

  constructor({
    name,
    dirname,
    basename,
    path,
    depth,
    children = [],
  }: {
    name: RelPath;
    dirname: AbsPath;
    basename: RelPath;
    path: AbsPath;
    depth: number;
    children?: Array<TreeNode>;
  }) {
    super({ name, type: "dir", dirname, basename, path, depth });
    this.children = children;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      children: this.children.map((child) => child.toJSON()),
    };
  }
}

export class TreeDirRoot extends TreeDir {
  __root: boolean;

  constructor(
    name: RelPath,
    dirname: AbsPath,
    basename: RelPath,
    path: AbsPath,
    depth: number,
    children: Array<TreeNode> = []
  ) {
    super({ name, dirname, basename, path, depth, children });
    this.__root = true;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      __root: this.__root,
    };
  }
}

export class TreeFile extends TreeNode {
  constructor(name: RelPath, dirname: AbsPath, basename: RelPath, path: AbsPath, depth: number) {
    super({ name, type: "file", dirname, basename, path, depth });
  }
}

export type TreeList = Array<string>;

export class FileTree {
  static EmptyFileTree = () => new TreeDirRoot(relPath("root"), absPath("/"), relPath("root"), absPath("/"), 0, []);

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
        flat.push(node.path.str);
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

  recurseTree = async (dir: AbsPath, parent: TreeNode[] = [], depth = 0, haltOnError = false) => {
    try {
      const entries = await this.fs.promises.readdir(dir.str);
      await Promise.all(
        entries.map(async (entry) => {
          const fullPath = dir.join(entry.toString());
          const stat = await this.fs.promises.stat(fullPath.str);
          let nextParent: TreeNode[] | undefined = undefined;
          let treeEntry: TreeDir | TreeFile | string = "";

          if (stat.isDirectory()) {
            treeEntry = new TreeDir({
              name: relPath(entry.toString()),
              dirname: fullPath.dirname(),
              basename: fullPath.basename(),
              path: fullPath,
              depth: depth,
              children: [],
            });
            if (treeEntry instanceof TreeDir) {
              nextParent = treeEntry.children;
            }
            await this.recurseTree(fullPath, nextParent, depth + 1, haltOnError);
          } else {
            treeEntry = new TreeFile(
              relPath(entry.toString()),
              fullPath.dirname(),
              fullPath.basename(),
              fullPath,
              depth
            );
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
