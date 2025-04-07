import { FileSystem } from "@/clientdb/Disk";
import { getMimeType } from "@/lib/mimeType";
import { AbsPath, absPath, relPath, RelPath } from "@/lib/paths";
import { Mutex } from "async-mutex";

export type TreeNodeJType = ReturnType<TreeNode["toJSON"]>;

export class TreeNode {
  isVirtual = false;
  name: RelPath;
  type: "dir" | "file";
  dirname: AbsPath;
  mimeType?: string;
  basename: RelPath;
  parent: TreeDir | null;
  path: AbsPath;
  depth: number;
  children?: Record<string, TreeNode>;

  get length() {
    return this.path.str.length;
  }
  toString() {
    return this.path.str;
  }
  get str() {
    return this.toString();
  }

  constructor({
    name,
    type,
    dirname,
    mimeType,
    basename,
    path,
    parent,
    depth,
  }: {
    name: RelPath | string;
    type: "dir" | "file";
    dirname: AbsPath | string;
    basename: RelPath | string;
    parent: TreeDir | null;
    mimeType?: string;
    path: AbsPath | string;
    depth: number;
  }) {
    this.name = typeof name === "string" ? relPath(name) : name;
    this.type = type;
    this.mimeType = mimeType;
    this.dirname = typeof dirname === "string" ? absPath(dirname) : dirname;
    this.basename = typeof basename === "string" ? relPath(basename) : basename;
    this.path = typeof path === "string" ? absPath(path) : path;
    this.depth = depth;
    this.parent = parent;
  }

  inc() {
    this.path = this.path.inc();
    this.dirname = this.path.dirname();
    this.name = this.path.basename();
    this.basename = this.path.basename();
    return this;
  }
  rename(path: AbsPath) {
    this.path = path;
    this.dirname = this.path.dirname();
    this.name = this.path.basename();
    this.basename = this.path.basename();
    return this;
  }
  copy() {
    if (this.type === "dir") {
      return new TreeDir({
        name: this.name,
        dirname: this.dirname,
        basename: this.basename,
        parent: this.parent,
        path: this.path,
        depth: this.depth,
        children: this.children ?? {},
      });
    }
    return new TreeFile({
      name: this.name,
      dirname: this.dirname,
      basename: this.basename,
      mimeType: this.mimeType || getMimeType(this.path),
      parent: this.parent,
      path: this.path,
      depth: this.depth,
    });
  }
  static fromJSON(json: TreeNodeJType, parent: TreeDir | null = null): TreeNode {
    return new TreeNode({ ...json, parent });
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
  id = Date.now();
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
  mimeType = "text/markdown";
  constructor({
    name,
    dirname,
    basename,
    mimeType,
    path,
    depth,
    parent,
  }: {
    name: RelPath;
    dirname: AbsPath;
    mimeType: string;
    basename: RelPath;
    path: AbsPath;
    depth: number;
    parent: TreeDir | null;
  }) {
    super({ name, type: "file", parent, dirname, basename, path, depth });
    this.mimeType = mimeType;
  }
}

export type TreeList = Array<string>;

class VirtualFileTreeNode extends TreeFile {
  isVirtual = true;
}

class VirtualDirTreeNode extends TreeDir {
  isVirtual = true;
}

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
  // nodeList: (TreeNode | null)[] = [];
  static SKIPPED: "skipped";
  static INDEXED: "index";
  private map = new Map<string, TreeNode>();

  // private tree: TreeDir = this.root;
  constructor(private fs: FileSystem) {}
  private mutex = new Mutex();

  getRootTree() {
    return this.root;
  }

  flatDirTree = () => {
    return [...this.map.keys()];
  };

  findRange = (startNode: TreeNode, endNode: TreeNode) => {
    const [startIndex, endIndex] = this.dirs.reduce(
      (indices, path, index) => {
        if (path === startNode.path.str) indices[0] = index;
        if (path === endNode.path.str) indices[1] = index;
        return indices;
      },
      [-1, -1] // Initial indices
    );
    // Ensure both nodes were found
    if (startIndex === -1 || endIndex === -1) {
      // console.warn("Start or end node not found in the directory list.");
      return null;
    }
    // Sort indices to ensure correct slice
    const [fromIndex, toIndex] = [startIndex, endIndex].sort((a, b) => a - b);
    return this.dirs.slice(fromIndex, toIndex + 1);
  };

  findRange2 = (startNode: TreeNode, endNode: TreeNode) => {
    let i = 0;
    let j = this.dirs.length - 1;
    while (i < j) {
      if (this.dirs[i] !== startNode.path.str && this.dirs[i] !== endNode.path.str) {
        i++;
      }
      if (this.dirs[j] !== startNode.path.str && this.dirs[j] !== endNode.path.str) {
        j--;
      }
    }
    this.dirs.slice(Math.min(i, j), Math.max(i, j) + 1);
    // return [this.nodeFromPath(this.dirs[i]), this.nodeFromPath(this.dirs[j])];
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
        this.map = new Map<string, TreeNode>();
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

  //pre order traversal
  recurseTree = async (parent = this.root, depth = 0, haltOnError = false) => {
    const dir = parent.path;
    try {
      const entries = await this.fs.readdir(dir.str);

      // Separate directories and files
      const directories: string[] = [];
      const files: string[] = [];

      await Promise.all(
        entries.map(async (entry) => {
          const fullPath = dir.join(entry.toString());
          const stat = await this.fs.stat(fullPath.str);

          if (stat.isDirectory()) {
            directories.push(entry.toString());
          } else {
            files.push(entry.toString());
          }
        })
      );

      // Process files first
      await Promise.all(
        files.map(async (entry) => {
          const fullPath = dir.join(entry.toString());
          const treeEntry = new TreeFile({
            name: relPath(entry.toString()),
            dirname: fullPath.dirname(),
            basename: fullPath.basename(),
            path: fullPath,
            mimeType: getMimeType(fullPath),
            parent,
            depth: depth,
          });
          this.insertNode(parent, treeEntry);
        })
      );

      // Process directories in order
      for (const entry of directories) {
        const fullPath = dir.join(entry.toString());
        const treeEntry = new TreeDir({
          name: relPath(entry.toString()),
          dirname: fullPath.dirname(),
          basename: fullPath.basename(),
          path: fullPath,
          parent,
          depth: depth,
          children: {},
        });

        this.insertNode(parent, treeEntry);

        // Recurse into the directory
        await this.recurseTree(treeEntry, depth + 1, haltOnError);
      }
    } catch (err) {
      console.error(`Error reading ${dir}:`, err);
      if (haltOnError) {
        throw err;
      }
    }
  };

  flatTreeToNodeList = () => {
    return this.flatDirTree().map((path) => {
      const node = this.map.get(path);
      if (node) return node;
      return null;
    });
  };

  removeNodeByPath(path: AbsPath) {
    const node = this.map.get(path.str);
    if (node) {
      this.removeSelfByPathFromParent(path, node);
      this.map.delete(path.str);
    }
  }
  removeSelfByPathFromParent(path: AbsPath, selfNode: TreeNode) {
    delete selfNode?.parent?.children[path.basename().str];
    this.map.delete(path.str);
  }
  insertNode(parent: TreeDir, newNode: TreeNode) {
    this.map.set(newNode.path.str, newNode);
    return insertNode(parent, newNode);
  }
  nodeWithPathExists(path: AbsPath) {
    return this.map.has(path.str);
  }
  replaceNode(oldNode: TreeNode, newNode: TreeNode) {
    const parent = oldNode.parent;
    if (!parent) return;
    parent.children[newNode.name.str] = newNode;
    this.map.delete(oldNode.path.str);
    this.map.set(newNode.path.str, newNode);
  }
  insertClosestNode(node: Pick<TreeNode, "name" | "type">, selectedNode: TreeNode) {
    const parent = closestTreeDir(selectedNode);

    const newNode = newVirtualTreeNode({ ...node, parent });
    while (this.nodeWithPathExists(newNode.path)) newNode.inc();
    return this.insertNode(parent, newNode);
  }

  nodeFromPath(path: AbsPath | string): TreeNode | null {
    return this.map.get(path + "") ?? null;
  }
}

function closestTreeDir(node: TreeNode): TreeDir {
  if (!node.parent) return node as TreeDir; //assumes root
  if (node.type === "file") return closestTreeDir(node.parent!);
  return node as TreeDir;
}

// function removeNode(node: TreeNode) {
//   if (!node.parent) return;
//   delete node.parent.children[node.name.str];
// }
// function insertClosestNode(node: Pick<TreeNode, "path" | "type">, selectedNode: TreeNode) {
//   const parent = closestTreeDir(selectedNode);
//   const newNode = newTreeNode({ ...node, parent, depth: parent.depth + 1 });
//   return insertNode(parent, newNode);
// }
function insertNode(targetNode: TreeDir, newNode: TreeNode) {
  // const parentNode = closestTreeDir(targetNode);
  targetNode.children[newNode.name.str] = newNode;
  return newNode;
}

function newVirtualTreeNode({ type, parent, name }: { type: "file" | "dir"; name: RelPath; parent: TreeDir }) {
  const path = parent.path.join(name);
  const depth = parent.depth + 1;
  if (type === "dir") {
    return new VirtualDirTreeNode({
      name: path.basename(),
      dirname: path.dirname(),
      basename: path.basename(),
      path,
      parent,
      depth,
      children: {},
    });
  } else {
    return new VirtualFileTreeNode({
      name: path.basename(),
      dirname: path.dirname(),
      basename: path.basename(),
      mimeType: getMimeType(path.str),
      path,
      parent,
      depth,
    });
  }
}
