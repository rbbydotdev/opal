import { CommonFileSystem } from "@/Db/Disk";
import { isErrorWithCode, NotFoundError } from "@/lib/errors";
import { exhaustAsyncGenerator } from "@/lib/exhaustAsyncGenerator";
import {
  TreeDir,
  TreeDirRoot,
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
  // extname,
  joinPath,
  RelPath,
  relPath,
} from "@/lib/paths2";
import { Mutex } from "async-mutex";

export class FileTree {
  initialIndex = false;
  guid: string;
  cacheId: string;
  private map = new Map<string, TreeNode>();
  private _root: TreeDirRoot = new TreeDirRoot();
  set root(root: TreeDirRoot) {
    this._root = root;
    this.updateMap();
  }
  get root() {
    return this._root;
  }
  indexMutex = new Mutex();

  /* 
  
  TODO: What if disk is injected so nodes code easily do TreeNode.read ? or TreeNode.delete?


  */

  constructor(private fs: CommonFileSystem, guid: string, private fsMutex: Mutex) {
    this.guid = `${guid}/FileTree`;
    this.cacheId = `${this.guid}/cache`;
  }

  walk = (...args: Parameters<TreeDirRoot["walk"]>) => this.root.walk(...args);
  asyncWalk = (...args: Parameters<TreeDirRoot["asyncWalk"]>) => this.root.asyncWalk(...args);

  getRootTree() {
    return this.root;
  }

  iterator(...args: Parameters<TreeDirRoot["iterator"]>) {
    return this.root.iterator(...args);
  }
  files() {
    return this.root.iterator((node) => node.isTreeFile());
  }

  dirs() {
    return Array.from(this.root.iterator((node) => node.isTreeDir()));
  }
  all() {
    return Array.from(this.root.iterator());
  }

  findRange = (startNode: TreeNode, endNode: TreeNode) => {
    const [startIndex, endIndex] = this.all().reduce(
      (indices, node, index) => {
        if (node.path === startNode.path) indices[0] = index;
        if (node.path === endNode.path) indices[1] = index;
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
    return this.all()
      .slice(fromIndex, toIndex + 1)
      .map((node) => node.path);
  };

  static FromJSON(json: TreeNodeDirJType, fs: CommonFileSystem, guid: string, mutex: Mutex) {
    const tree = new FileTree(fs, guid, mutex);
    tree.root = TreeDirRoot.FromJSON(json);
    return tree;
  }

  updateMap() {
    this.map = new Map([...this.iterator()].map((node) => [node.path, node]));
  }

  async index(tree?: TreeDirRoot) {
    await exhaustAsyncGenerator(this.indexIter(tree));
    return this.root;
  }
  async *indexIter(tree = new TreeDirRoot()): AsyncGenerator<TreeNode, unknown, unknown> {
    if (this.indexMutex.isLocked()) {
      await this.indexMutex.waitForUnlock();
      return this.root.iterator();
    }
    try {
      await Promise.all([this.fsMutex.acquire(), this.indexMutex.acquire()]);
      console.debug("Indexing file tree");
      for await (const node of this.recurseTree(tree)) {
        yield node;
      }
      this.initialIndex = true;
      this.root = tree;
      return;
    } catch (e) {
      console.error("Error during file tree indexing:", e);
      throw e;
    } finally {
      await Promise.all([this.fsMutex.release(), this.indexMutex.release()]);
    }
  }

  async tryFirstIndex() {
    if (this.initialIndex) return this.root;
    await this.index();
  }

  async *recurseTree(
    parent: TreeDir = this.root,
    depth = 0,
    haltOnError = false
  ): AsyncGenerator<TreeNode, void, unknown> {
    const dir = parent.path;
    try {
      const entries = (await this.fs.readdir(encodePath(dir))).map((e) => relPath(decodePath(e.toString())));
      for (const entry of entries) {
        const fullPath = joinPath(dir, entry);
        try {
          const stat = await this.fs.stat(encodePath(fullPath));
          const node = TreeNode.FromPath(fullPath, stat.isDirectory() ? "dir" : "file", parent);
          yield this.insertNode(parent, node);
          if (node.isTreeDir()) {
            yield* await this.recurseTree(node, depth + 1, haltOnError);
          }
        } catch (e) {
          if (isErrorWithCode(e, "ENOENT")) {
            console.error(`stat error for file ${fullPath} in ${dir}`);
            throw new NotFoundError(`File not found: ${fullPath} in ${dir}`, fullPath);
          }
          throw e;
        }
      }
    } catch (e) {
      if (!haltOnError && e instanceof NotFoundError) {
        console.error(e);
        yield* await this.recurseTree(parent, depth, haltOnError);
        return;
      }
      throw e;
    }
  }

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
    const node = this.map.get(path);
    if (node) {
      this.removeSelfByPathFromParent(path, node);
      this.map.delete(path);
      return true;
    }
    return false;
  }
  removeSelfByPathFromParent(path: AbsPath, selfNode: TreeNode) {
    delete selfNode?.parent?.children[basename(path)];
    this.map.delete(path);
  }
  insertNode(parent: TreeDir, newNode: TreeNode | VirtualTreeNode) {
    this.map.set(newNode.path, newNode);
    return spliceNode(parent, newNode);
  }
  nodeWithPathExists(path: AbsPath) {
    return this.map.has(path);
  }
  replaceNode(oldNode: TreeNode, newNode: TreeNode) {
    const parent = oldNode.parent;
    if (!parent) return;
    parent.children[newNode.name] = newNode;
    this.map.delete(oldNode.path);
    this.map.set(newNode.path, newNode);
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
  if (node.isTreeFile()) return closestTreeDir(node.parent!);
  return node as TreeDir;
}

function spliceNode(targetNode: TreeDir, newNode: TreeNode) {
  targetNode.children[newNode.name] = newNode;
  targetNode.children = Object.fromEntries(Object.entries(targetNode.children));
  return newNode;
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
