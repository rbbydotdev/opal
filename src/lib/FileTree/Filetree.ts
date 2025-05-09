import { FileSystem } from "@/Db/Disk";
import {
  TreeDir,
  TreeDirRoot,
  TreeFile,
  TreeList,
  TreeNode,
  TreeNodeDirJType,
  VirtualDirTreeNode,
  VirtualFileTreeNode,
} from "@/lib/FileTree/TreeNode";
import { getMimeType } from "@/lib/mimeType";
import { AbsPath, relPath, RelPath } from "@/lib/paths";
import { Mutex } from "async-mutex";

export class FileTree {
  initialIndex = false;
  guid: string;
  cacheId: string;

  dirs: TreeList = [];
  // nodeList: (TreeNode | null)[] = [];
  private map = new Map<string, TreeNode>();
  public root: TreeDirRoot = new TreeDirRoot();

  // private tree: TreeDir = this.root;
  constructor(private fs: FileSystem, guid: string) {
    this.guid = `${guid}/FileTree`;

    this.cacheId = `${this.guid}/cache/v2`;
  }
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
    return this.index();
  };

  indexFromJSON = async (json: TreeNodeDirJType) => {
    this.map = new Map<string, TreeNode>();
    this.root = TreeDirRoot.fromJSON(json);
    this.dirs = this.flatDirTree();
    this.root.walk((node) => this.map.set(node.path.str, node));
    // this.initialIndex = true; ?
  };

  static fromJSON(json: TreeNodeDirJType, fs: FileSystem, guid: string) {
    const tree = new FileTree(fs, guid);
    tree.root = TreeDirRoot.fromJSON(json);
    tree.map = new Map<string, TreeNode>();
    tree.root.walk((node) => tree.map.set(node.path.str, node));
    return tree;
  }

  index = async ({
    tree = new TreeDirRoot(),

    visitor,
  }: { tree?: TreeDirRoot; visitor?: (node: TreeNode) => TreeNode | Promise<TreeNode> } = {}) => {
    const release = await this.mutex.acquire();
    try {
      this.map = new Map<string, TreeNode>();
      this.root = tree?.isEmpty?.() ? ((await this.recurseTree(tree, visitor)) as TreeDirRoot) : tree;

      this.dirs = this.flatDirTree();
      this.initialIndex = true;
    } catch (e) {
      console.error("Error during file tree indexing:", e);
      throw e;
    } finally {
      release(); // Release the lock
    }
    console.timeEnd("Indexing file tree");
    console.debug(Object.keys(this.root.children).join(", "));
    this.root.walk((node) => this.map.set(node.path.str, node));
    return this.root;
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
  recurseTree = async (
    parent: TreeDir = this.root,
    visitor: (node: TreeNode) => TreeNode | Promise<TreeNode> = (node) => node,
    depth = 0,
    haltOnError = false
  ): Promise<TreeDir> => {
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
          const result = visitor(treeEntry);
          this.insertNode(parent, result instanceof Promise ? await result : result);
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

        const result = visitor(treeEntry);
        this.insertNode(parent, result instanceof Promise ? await result : result);

        // Recurse into the directory
        await this.recurseTree(treeEntry, visitor, depth + 1, haltOnError);
      }
      return parent;
    } catch (err) {
      console.error(`Error reading ${dir}:`, err);
      if (haltOnError) {
        throw err;
      }
    }
    return parent;
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
    return spliceNode(parent, newNode);
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
function spliceNode(targetNode: TreeDir, newNode: TreeNode) {
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
