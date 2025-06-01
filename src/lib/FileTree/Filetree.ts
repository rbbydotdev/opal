import { CommonFileSystem } from "@/Db/Disk";
import { isErrorWithCode, NotFoundError } from "@/lib/errors";
import {
  TreeDir,
  TreeDirRoot,
  TreeFile,
  TreeList,
  TreeNode,
  TreeNodeDirJType,
  VirtualDirTreeNode,
  VirtualFileTreeNode,
  VirtualTreeNode,
} from "@/lib/FileTree/TreeNode";
import {
  AbsPath,
  absPath,
  basename,
  decodePath,
  dirname,
  encodePath,
  extname,
  joinPath,
  RelPath,
  relPath,
} from "@/lib/paths2";
import { Mutex } from "async-mutex";

export class FileTree {
  initialIndex = false;
  guid: string;
  cacheId: string;
  dirs: TreeList = [];
  private map = new Map<string, TreeNode>();
  public root: TreeDirRoot = new TreeDirRoot();

  // private tree: TreeDir = this.root;
  constructor(private fs: CommonFileSystem, guid: string, private mutex = new Mutex()) {
    this.guid = `${guid}/FileTree`;

    this.cacheId = `${this.guid}/cache`;
  }

  getRootTree() {
    return this.root;
  }

  flatDirTree = () => {
    return [...this.map.keys()];
  };

  findRange = (startNode: TreeNode, endNode: TreeNode) => {
    const [startIndex, endIndex] = this.dirs.reduce(
      (indices, path, index) => {
        if (path === (startNode.path as string)) indices[0] = index;
        if (path === (endNode.path as string)) indices[1] = index;
        return indices;
      },
      [-1, -1] // Initial indices
    );
    // Ensure both nodes were found
    if (startIndex === -1 || endIndex === -1) {
      return null;
    }
    // Sort indices to ensure correct slice
    const [fromIndex, toIndex] = [startIndex, endIndex].sort((a, b) => a - b);
    return this.dirs.slice(fromIndex, toIndex + 1);
  };

  static fromJSON(json: TreeNodeDirJType, fs: CommonFileSystem, guid: string) {
    const tree = new FileTree(fs, guid);
    tree.root = TreeDirRoot.fromJSON(json);
    tree.map = new Map<string, TreeNode>();
    tree.root.walk((node) => tree.map.set(node.path as string, node));
    return tree;
  }

  updateIndex = (path: AbsPath, type: "file" | "dir") => {
    //recursive to back fill parent nodes
    const node = this.nodeFromPath(path);
    if (node) return node;
    const parent = (dirname(path) === "/" ? this.root : this.updateIndex(absPath(dirname(path)), "dir")) || this.root;
    const newNode = TreeNode.FromPath(path, type, parent as TreeDir);
    this.insertNode(newNode.parent!, newNode);
    this.map.set(path as string, newNode);
    this.dirs = this.flatDirTree();
    return newNode;
  };

  index = async ({
    tree = new TreeDirRoot(),
    visitor,
  }: { tree?: TreeDirRoot; visitor?: (node: TreeNode) => TreeNode | Promise<TreeNode> } = {}) => {
    try {
      await this.mutex.acquire();
      console.debug("Indexing file tree");
      this.map = new Map<string, TreeNode>();
      this.root = tree?.isEmpty?.() ? ((await this.recurseTree(tree, visitor)) as TreeDirRoot) : tree;
      this.root.walk((node) => this.map.set(node.path as string, node));
      this.dirs = this.flatDirTree();
      this.initialIndex = true;
      return this.root;
    } catch (e) {
      console.error("Error during file tree indexing:", e);
      throw e;
    } finally {
      await this.mutex.release();
    }
  };

  walk = (...args: Parameters<TreeDirRoot["walk"]>) => this.root.walk(...args);
  asyncWalk = (...args: Parameters<TreeDirRoot["asyncWalk"]>) => this.root.asyncWalk(...args);

  //pre order traversal, recurse fs tree and apply visitor function to each node
  recurseTree = async (
    parent: TreeDir = this.root,
    visitor: (node: TreeNode) => TreeNode | Promise<TreeNode> = (node) => node,
    depth = 0,
    haltOnError = false
  ): Promise<TreeDir> => {
    const dir = parent.path;
    try {
      const entries = (await this.fs.readdir(encodePath(dir))).map((e) => relPath(decodePath(e.toString())));

      // Separate directories and files
      const directories: RelPath[] = [];
      const files: RelPath[] = [];

      try {
        await Promise.all(
          entries.map(async (entry) => {
            const fullPath = joinPath(dir, entry);
            const stat = await this.fs.stat(encodePath(fullPath)).catch((e) => {
              if (isErrorWithCode(e, "ENOENT")) {
                console.error(`stat error for file ${fullPath}`);
                throw new NotFoundError(`File not found: ${fullPath}`, fullPath as string);
              }
              throw e;
            });
            if (stat.isDirectory()) {
              directories.push(entry);
            } else {
              files.push(entry);
            }
          })
        );
      } catch (e) {
        //sometimes the stat fails for a directory that was removed in the meantime
        //therefore we catch and retry all over again
        if (!haltOnError && e instanceof NotFoundError) {
          return this.recurseTree(parent, visitor, depth, haltOnError);
        }
        throw e;
      }

      // Process files first
      await Promise.all(
        files.map(async (entry) => {
          const fullPath = joinPath(dir, entry);
          const treeEntry = new TreeFile({
            name: relPath(entry as string),
            dirname: absPath(dirname(fullPath)),
            basename: relPath(basename(fullPath)),
            path: fullPath,
            parent,
            depth: depth,
          });
          const result = visitor(treeEntry);
          this.insertNode(parent, result instanceof Promise ? await result : result);
        })
      );

      // Process directories in order
      for (const entry of directories) {
        const fullPath = joinPath(dir, entry);
        const treeEntry = new TreeDir({
          name: entry,
          dirname: absPath(dirname(fullPath)),
          basename: relPath(basename(fullPath)),
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
      console.error(`Error reading dir ${dir}:`, err);
      if (haltOnError) {
        throw err;
      }
    }
    return parent;
  };

  allChildrenArray = (parent: TreeDir): TreeNode[] => {
    const result: TreeNode[] = [];
    parent.walk((node) => {
      result.push(node);
    });
    return result;
  };
  allNodesArray = () => {
    return Array.from(this.map.values());
  };

  removeNodeByPath(path: AbsPath) {
    const node = this.map.get(path as string);
    if (node) {
      this.removeSelfByPathFromParent(path, node);
      this.map.delete(path as string);
      return true;
    }
    return false;
  }
  removeSelfByPathFromParent(path: AbsPath, selfNode: TreeNode) {
    delete selfNode?.parent?.children[basename(path)];
    this.map.delete(path as string);
  }
  insertNode(parent: TreeDir, newNode: TreeNode | VirtualTreeNode) {
    this.map.set(newNode.path as string, newNode);
    return spliceNode(parent, newNode);
  }
  nodeWithPathExists(path: AbsPath) {
    return this.map.has(path as string);
  }
  replaceNode(oldNode: TreeNode, newNode: TreeNode) {
    const parent = oldNode.parent;
    if (!parent) return;
    parent.children[newNode.name as string] = newNode;
    this.map.delete(oldNode.path as string);
    this.map.set(newNode.path as string, newNode);
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

function spliceNode(targetNode: TreeDir, newNode: TreeNode) {
  targetNode.children[newNode.name as string] = newNode;
  targetNode.children = Object.fromEntries(Object.entries(targetNode.children));
  return newNode;
}

function _sortNodesByName(nodes: Record<string, TreeNode>) {
  return Object.entries(nodes).sort(([keyA, nodeA], [keyB, nodeB]) => {
    if (nodeA.type === "dir" && nodeB.type === "file") return -1;
    if (nodeA.type === "file" && nodeB.type === "dir") return 1;
    if (nodeA.type === "file" && nodeB.type === "file") {
      const extA = extname(nodeA.path) || "";
      const extB = extname(nodeB.path) || "";
      const extComparison = extA.localeCompare(extB);
      if (extComparison !== 0) return extComparison;
    }
    return keyA.localeCompare(keyB);
  });
}

function newVirtualTreeNode({ type, parent, name }: { type: "file" | "dir"; name: RelPath; parent: TreeDir }) {
  const path = joinPath(parent.path, name);
  const depth = parent.depth + 1;
  if (type === "dir") {
    return new VirtualDirTreeNode({
      name: relPath(basename(path)),
      dirname: absPath(dirname(path)),
      basename: relPath(basename(path)),
      path,
      parent,
      depth,
      children: {},
    });
  } else {
    return new VirtualFileTreeNode({
      name: relPath(basename(path)),
      dirname: absPath(dirname(path)),
      basename: relPath(basename(path)),
      path,
      parent,
      depth,
    });
  }
}
