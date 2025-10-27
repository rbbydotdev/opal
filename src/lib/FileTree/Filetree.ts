import { CommonFileSystem } from "@/data/FileSystemTypes";
import { isErrorWithCode, NotFoundError } from "@/lib/errors";
import { exhaustAsyncGenerator } from "@/lib/exhaustAsyncGenerator";
import {
  TreeDir,
  TreeDirRoot,
  TreeDirRootJType,
  TreeNode,
  TreeNodeDirJType,
  TreeNodeType,
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
  joinPath,
  RelPath,
  relPath,
  stringifyEntry,
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
    if (!this.initialIndex) this.initialIndex = true;
    return this._root;
  }
  indexMutex = new Mutex();

  /* 
  
  TODO: What if disk is injected so nodes code easily do TreeNode.read ? or TreeNode.delete?


  */

  constructor(
    private fs: CommonFileSystem,
    guid: string,
    private fsMutex: Mutex
  ) {
    this.guid = `${guid}/FileTree`;
    this.cacheId = `${this.guid}/cache`;
  }

  clone(mutex: Mutex) {
    const newTree = new FileTree(this.fs, this.guid, mutex);
    newTree.root = this.root;
    return newTree;
  }

  walk = (...args: Parameters<TreeDirRoot["walk"]>) => this.root.walk(...args);
  asyncWalk = (...args: Parameters<TreeDirRoot["asyncWalk"]>) => this.root.asyncWalk(...args);
  asyncWalkIterator = (...args: Parameters<TreeDirRoot["asyncWalkIterator"]>) => this.root.asyncWalkIterator(...args);

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
  prev(node: TreeNode) {
    const allNodes = this.all();
    const index = allNodes.indexOf(node);
    if (index > 0) {
      return allNodes[index - 1];
    }
    return null;
  }
  next(node: TreeNode) {
    const allNodes = this.all();
    const index = allNodes.indexOf(node);
    if (index < allNodes.length - 1) {
      return allNodes[index + 1];
    }
    return null;
  }
  all(): TreeNode[] {
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
      .slice(fromIndex, toIndex! + 1)
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
  //forces the index, for the case of loading from cache
  forceIndex(tree: TreeDirRoot | TreeDirRootJType) {
    if (tree instanceof TreeDirRoot) {
      this.root = tree;
    } else {
      this.root = TreeDirRoot.FromJSON(tree);
    }
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
      //happens already in the setter() this.initialIndex = true;
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

  private async *recurseTree(
    parent: TreeDir = this.root,
    depth = 0,
    haltOnError = false
  ): AsyncGenerator<TreeNode, void, unknown> {
    const dir = parent.path;
    try {
      const entries = (await this.fs.readdir(encodePath(dir))).map((e) => relPath(decodePath(stringifyEntry(e))));
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
    // return ([...parent.iterator()])
    const result: TreeNode[] = [];
    parent.walk((node) => {
      result.push(node);
    });
    return result;
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
  insertNode<T extends VirtualTreeNode | TreeNode>(parent: TreeDir, newNode: T) {
    this.map.set(newNode.path, newNode);
    return spliceNode(parent, newNode);
  }
  nodeWithPathExists(path: AbsPath) {
    return this.map.has(path);
  }
  replaceNode(oldNode: TreeNode, newNode: TreeNode) {
    const parent = oldNode.parent;
    if (!parent) return;
    parent.children[newNode.basename] = newNode as TreeNodeType;
    this.map.delete(oldNode.path);
    this.map.set(newNode.path, newNode);
  }
  insertClosestVirtualNode(node: Pick<TreeNode, "basename" | "type">, selectedNode: TreeNode, virtualContent?: string) {
    const parent = selectedNode.closestDir() ?? this.root;
    const newNode = newVirtualTreeNode({ basename: node.basename, type: node.type, parent, virtualContent });
    while (this.nodeWithPathExists(newNode.path)) newNode.inc();
    return this.insertNode(parent, newNode);
  }

  nodeFromPath(path: AbsPath | string): TreeNode | null {
    return this.map.get(path + "") ?? null;
  }
}

function spliceNode<T extends VirtualTreeNode | TreeNode>(targetNode: TreeDir, newNode: T) {
  targetNode.children = Object.fromEntries([...Object.entries(targetNode.children), [newNode.basename, newNode]]);
  return newNode;
}

function newVirtualTreeNode(props: {
  type: "file" | "dir";
  basename: RelPath;
  parent: TreeDir;
  virtualContent?: string;
}) {
  const path = joinPath(props.parent.path, props.basename);
  const depth = props.parent.depth + 1;
  if (props.type === "dir") {
    return new VirtualDirTreeNode({
      dirname: absPath(dirname(path)),
      basename: relPath(basename(path)),
      path,
      parent: props.parent,
      depth,
      children: {},
    });
  } else {
    return new VirtualFileTreeNode({
      dirname: absPath(dirname(path)),
      basename: relPath(basename(path)),
      virtualContent: props.virtualContent,
      path,
      parent: props.parent,
      depth,
    });
  }
}
class NullFileTree extends FileTree {
  constructor() {
    super({} as CommonFileSystem, "NullFileTree", new Mutex());
    this.root = new TreeDirRoot();
  }

  async index() {
    return this.root;
  }

  async *indexIter() {
    yield this.root;
  }

  nodeFromPath() {
    return null;
  }
}

export const NULL_FILE_TREE = new NullFileTree();
