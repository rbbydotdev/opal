import { FileSystem } from "@/clientdb/Disk";
import { AbsPath, absPath, relPath, RelPath } from "@/lib/paths";
import { Mutex } from "async-mutex";

export class TreeNode {
  name: RelPath;
  type: "dir" | "file";
  dirname: AbsPath;
  basename: RelPath;
  parent: TreeDir | null;
  path: AbsPath;
  depth: number;

  constructor({
    name,
    type,
    dirname,
    basename,
    path,
    parent,
    depth,
  }: {
    name: RelPath;
    type: "dir" | "file";
    dirname: AbsPath;
    basename: RelPath;
    parent: TreeDir | null;
    path: AbsPath;
    depth: number;
  }) {
    this.name = typeof name === "string" ? relPath(name) : name;
    this.type = type;
    this.dirname = typeof dirname === "string" ? absPath(dirname) : dirname;
    this.basename = typeof basename === "string" ? relPath(basename) : basename;
    this.path = typeof path === "string" ? absPath(path) : path;
    this.depth = depth;
    this.parent = parent;
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

// const TreeDirSymbol = ;
export class TreeDir extends TreeNode {
  children: Record<string, TreeNode>;
  type = "dir" as const;

  // private [Symbol("TreeDir")]: void;

  constructor({
    name,
    dirname,
    basename,
    path,
    depth,
    children = {},
    parent,
  }: {
    name: RelPath;
    dirname: AbsPath;
    basename: RelPath;
    parent: TreeDir | null;
    path: AbsPath;
    depth: number;
    children: TreeDir["children"];
  }) {
    super({ name, type: "dir", dirname, parent, basename, path, depth });
    this.children = children;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      children: Object.fromEntries(Object.entries(this.children).map(([key, child]) => [key, child.toJSON()])),
    };
  }
}

export class TreeDirRoot extends TreeDir {
  constructor({
    name,
    dirname,
    basename,
    path,
    depth,
    children,
  }: {
    name: RelPath;
    dirname: AbsPath;
    basename: RelPath;
    path: AbsPath;
    depth: number;
    children: TreeDir["children"];
  }) {
    super({ name, dirname, basename, path, depth, children, parent: null });
  }

  toJSON() {
    return {
      ...super.toJSON(),
    };
  }
}

export function isTreeFile(node: TreeNode): node is TreeFile {
  return node.type === "file";
}
export function isTreeDir(node: TreeNode): node is TreeDir {
  return node.type === "dir";
}
// export function getTreeType<T extends TreeNode>(node: T): "dir" | "file" {
//   return node.type;
// }

export class TreeFile extends TreeNode {
  type = "file" as const;
  constructor({
    name,
    dirname,
    basename,
    path,
    depth,
    parent,
  }: {
    name: RelPath;
    dirname: AbsPath;
    basename: RelPath;
    path: AbsPath;
    depth: number;
    parent: TreeDir | null;
  }) {
    super({ name, type: "file", parent, dirname, basename, path, depth });
  }
}

export type TreeList = Array<string>;

export class FileTree {
  static EmptyFileTree = () =>
    new TreeDirRoot({
      name: relPath("root"),
      dirname: absPath("/"),
      basename: relPath("root"),
      path: absPath("/"),
      depth: 0,
      children: {},
    });

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
        await this.recurseTree(this.root);
        this.dirs = this.flatDirTree();
        this.initialIndex = true;
      } finally {
        release(); // Release the lock
      }
      console.debug("Indexing complete");
      console.debug(Object.keys(this.root.children).join(", "));
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
    for (const childNode of Object.values((node as TreeDir).children ?? {})) {
      if (status.exit) break;
      this.walk(cb, childNode, depth + 1, status);
    }
  }

  recurseTree = async (parent: TreeDir = this.root, depth = 0, haltOnError = false) => {
    const dir = parent.path;
    try {
      const entries = await this.fs.promises.readdir(dir.str);
      await Promise.all(
        entries.map(async (entry) => {
          const fullPath = dir.join(entry.toString());
          const stat = await this.fs.promises.stat(fullPath.str);
          // let nextParent: TreeDir["children"] | {} = undefined;
          let treeEntry: TreeNode;

          if (stat.isDirectory()) {
            treeEntry = new TreeDir({
              name: relPath(entry.toString()),
              dirname: fullPath.dirname(),
              basename: fullPath.basename(),
              path: fullPath,
              parent,
              depth: depth,
              children: {},
            });

            await this.recurseTree(treeEntry as TreeDir, depth + 1, haltOnError);
          } else {
            treeEntry = new TreeFile({
              name: relPath(entry.toString()),
              dirname: fullPath.dirname(),
              basename: fullPath.basename(),
              path: fullPath,
              parent,
              depth: depth,
            });
          }
          parent.children[entry.toString()] = treeEntry;
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

export function closestTreeDir(node: TreeNode): TreeDir {
  if (!node.parent) return node as TreeDir; //assumes root
  if (node.type === "file") return closestTreeDir(node.parent!);
  return node as TreeDir;
}
export function insertClosestTreeDir(node: TreeNode, targetNode: TreeNode) {
  const parentNode = closestTreeDir(targetNode);
  console.log(parentNode);
  parentNode.children[node.name.str] = node;
  return node;
}
export function insertNode(newNode: TreeNode, targetNode: TreeDir) {
  // const parentNode = closestTreeDir(targetNode);
  targetNode.children[newNode.name.str] = newNode;
}

export function newTreeNode({ type, path }: { type: "file" | "dir"; path: AbsPath }) {
  if (type === "dir") {
    return new TreeDir({
      name: path.basename(),
      dirname: path.dirname(),
      basename: path.basename(),
      path,
      parent: null,
      depth: 0,
      children: {},
    });
  } else {
    return new TreeFile({
      name: path.basename(),
      dirname: path.dirname(),
      basename: path.basename(),
      path,
      parent: null,
      depth: 0,
    });
  }
}
