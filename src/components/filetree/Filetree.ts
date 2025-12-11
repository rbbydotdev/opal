import {
  SourceTreeDirRoot,
  SourceTreeNode,
  TreeDir,
  TreeDirRoot,
  TreeDirRootJType,
  TreeNode,
  TreeNodeDirJType,
  TreeNodeType,
  VirtualDirTreeNode,
  VirtualFileTreeNode,
  VirtualTreeNode,
} from "@/components/filetree/TreeNode";
import { CommonFileSystem } from "@/data/fs/FileSystemTypes";
import { isErrorWithCode, NotFoundError } from "@/lib/errors/errors";
import { AbsPath, absPath, basename, dirname, joinPath, RelPath, relPath, stringifyEntry } from "@/lib/paths2";
import { Mutex } from "async-mutex";

export abstract class BaseFileTree<TRoot extends TreeDir = TreeDir> {
  initialIndex = false;
  guid: string;
  cacheId: string;
  private map = new Map<string, TreeNode>();
  protected abstract _root: TRoot;

  set root(root: TRoot) {
    this._root = root;
    this.updateMap();
  }
  get root(): TRoot {
    if (!this.initialIndex) this.initialIndex = true;
    return this._root;
  }
  indexMutex = new Mutex();
  get size() {
    return this.map.size;
  }

  /* 
  
  TODO: What if disk is injected so nodes code easily do TreeNode.read ? or TreeNode.delete?


  */

  constructor(
    protected fs: CommonFileSystem,
    guid: string,
    protected fsMutex: Mutex
  ) {
    this.guid = `${guid}/FileTree`;
    this.cacheId = `${this.guid}/cache`;
  }

  abstract forceIndex(tree: TRoot | TreeDirRootJType): void;
  protected abstract createNewRoot(): TRoot;
  abstract clone(mutex?: Mutex): this;

  walk = (...args: Parameters<TreeDirRoot["walk"]>) => this.root.walk(...args);
  asyncWalk = (...args: Parameters<TreeDirRoot["asyncWalk"]>) => this.root.asyncWalk(...args);

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

  async index(tree?: TRoot) {
    for await (const _ of this.indexIter(tree)) {
      /* no-op, just indexing */
    }
    return this.root;
  }
  //forces the index, for the case of loading from cache
  async *indexIter(tree?: TRoot): AsyncGenerator<TreeNode, unknown, unknown> {
    if (this.indexMutex.isLocked()) {
      await this.indexMutex.waitForUnlock();
      return this.root.iterator();
    }

    const indexTree = tree ?? this.createNewRoot();

    try {
      await Promise.all([this.fsMutex.acquire(), this.indexMutex.acquire()]);
      logger.debug("Indexing file tree");
      for await (const node of this.recurseTreeIndexing(indexTree)) {
        yield node;
      }
      //happens already in the setter() this.initialIndex = true;
      this.root = indexTree;
      return;
    } catch (e) {
      logger.error("Error during file tree indexing:", e);
      throw e;
    } finally {
      await Promise.all([this.fsMutex.release(), this.indexMutex.release()]);
    }
  }

  async tryFirstIndex() {
    if (this.initialIndex) return this.root;
    await this.index();
  }

  private async *recurseTreeIndexing(
    parent: TreeDir,
    depth = 0,
    haltOnError = false
  ): AsyncGenerator<TreeNode, void, unknown> {
    const dir = parent.path;
    try {
      const entries = (await this.fs.readdir(dir)).map((e) => relPath(stringifyEntry(e)));
      for (const entry of entries) {
        const fullPath = joinPath(dir, entry);
        try {
          const stat = await this.fs.stat(fullPath);
          const node = TreeNode.FromPath(fullPath, stat.isDirectory() ? "dir" : "file", parent, this.fs);
          yield this.insertNode(parent, node);
          if (node.isTreeDir()) {
            yield* await this.recurseTreeIndexing(node, depth + 1, haltOnError);
          }
        } catch (e) {
          if (isErrorWithCode(e, "ENOENT")) {
            logger.error(`stat error for file ${fullPath} in ${dir}`);
            throw new NotFoundError(`File not found: ${fullPath} in ${dir}`, fullPath);
          }
          throw e;
        }
      }
    } catch (e) {
      if (!haltOnError && e instanceof NotFoundError) {
        logger.error(e);
        // yield* await this.recurseTree(parent, depth, haltOnError);
        // Don't recurse infinitely - just return early when a directory is not found
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

  nodeFromPath(path?: AbsPath | null): TreeNode | null {
    if (!path) return null;
    return this.root.nodeFromPath(path);
  }

  // nodeFromPath(path?: AbsPath | null): TreeNode | null {
  //   if (!path) return null;
  //   return this.root.nodeFromPath(path);
  // }
}

export class FileTree extends BaseFileTree<TreeDirRoot> {
  protected _root: TreeDirRoot = new TreeDirRoot();

  protected createNewRoot(): TreeDirRoot {
    return new TreeDirRoot();
  }

  clone(mutex: Mutex = this.fsMutex): this {
    const newTree = new FileTree(this.fs, this.guid, mutex) as this;
    newTree.root = this.root.clone() as TreeDirRoot;
    return newTree;
  }

  forceIndex(tree: TreeDirRoot | TreeDirRootJType): void {
    if (tree instanceof TreeDirRoot) {
      this.root = tree;
    } else {
      this.root = TreeDirRoot.FromJSON(tree);
    }
  }

  toSourceTree(source = absPath("/")): SourceFileTree {
    if (this.initialIndex === false) {
      throw new Error("FileTree must be indexed before creating a scoped tree");
    }
    const subTree = this.root.nodeFromPath(source)?.deepCopy();
    if (!subTree || !subTree.isTreeDir()) {
      logger.error(`Scope path ${source} not found in file tree`);
      throw new Error(`Scope path ${source} not found in file tree`);
    }
    subTree.path = absPath("/");
    const sourceFileTree = new SourceFileTree(this.fs, this.guid, this.fsMutex);
    sourceFileTree.root = SourceTreeNode.New(subTree, source) as SourceTreeDirRoot;
    return sourceFileTree;
  }
}

export class SourceFileTree extends BaseFileTree<SourceTreeDirRoot> {
  protected _root: SourceTreeDirRoot = new SourceTreeDirRoot();

  protected createNewRoot(): SourceTreeDirRoot {
    return new SourceTreeDirRoot();
  }

  clone(mutex: Mutex = this.fsMutex): this {
    const newTree = new SourceFileTree(this.fs, this.guid, mutex) as this;
    newTree.root = this.root.clone() as SourceTreeDirRoot;
    return newTree;
  }

  // TODO: Indexing on SourceFileTree should be implemented properly to use source paths
  // and preserve source/path parity. For now, prevent indexing to avoid corruption.
  index(): never {
    throw new Error("SourceFileTree indexing not implemented - use the original FileTree for indexing");
  }

  indexIter(): never {
    throw new Error("SourceFileTree indexing not implemented - use the original FileTree for indexing");
  }

  forceIndex(tree: SourceTreeDirRoot | TreeDirRootJType): void {
    if (tree instanceof SourceTreeDirRoot) {
      this.root = tree;
    } else {
      const treeRoot = TreeDirRoot.FromJSON(tree);
      this.root = SourceTreeNode.New(treeRoot, treeRoot.path) as SourceTreeDirRoot;
    }
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
