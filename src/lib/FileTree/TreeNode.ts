import { SpecialDirs } from "@/Db/SpecialDirs";
import { getMimeType } from "@/lib/mimeType";
import {
  AbsPath,
  RelPath,
  absPath,
  basename,
  dirname,
  depth as getDepth,
  incPath,
  isCss,
  isEjs,
  isHtml,
  isImage,
  isMarkdown,
  isText,
  joinPath,
  prefix,
  relPath,
  strictPrefix,
} from "@/lib/paths2";
import { extname } from "path";

export type TreeFileJType = ReturnType<TreeNode["toJSON"]> & {
  type: "file";
};

export type TreeNodeJType = TreeFileJType | TreeNodeDirJType;

export type TreeDirRootJType = TreeNodeDirJType;

export type TreeNodeDirJType = ReturnType<TreeNode["toJSON"]> & {
  children: Record<string, TreeFileJType | TreeNodeDirJType>;
  type: "dir";
};

export type TreeNodeType = TreeFile | TreeDir;

export class TreeNode {
  isVirtual?: boolean;
  source?: AbsPath; // For virtual nodes, this is the source path of the original file
  type: "dir" | "file";
  parent: TreeDir | null;
  depth: number;
  children?: Record<string, TreeNode>;

  private _dirname: AbsPath;
  private _basename: RelPath;
  private _path: AbsPath;

  get dirname(): AbsPath {
    return this._dirname;
  }

  set dirname(value: AbsPath) {
    this._dirname = value;
    this._path = absPath(joinPath(this._dirname, this._basename));
    this.adjustChildrenPaths();
  }

  get basename(): RelPath {
    return this._basename;
  }

  set basename(value: RelPath) {
    this._basename = value;
    this._path = absPath(joinPath(this._dirname, this._basename));
    this.adjustChildrenPaths();
  }

  get path(): AbsPath {
    return this._path;
  }

  set path(value: AbsPath) {
    this._path = value;
    this._dirname = absPath(dirname(this._path));
    this._basename = relPath(basename(this._path));
    this.adjustChildrenPaths();
  }

  get length() {
    return this.path.length;
  }
  scope(path: AbsPath | string): TreeNode | null {
    if (this.path.startsWith(path) || path.startsWith(this.path)) {
      if (this.isTreeDir()) {
        return new TreeDir({
          ...this,
          children:
            Object.fromEntries(
              Object.entries(this.children ?? {})
                .map(([key, child]) => {
                  const scoped = child.scope(path);
                  return scoped ? [key, scoped] : null;
                })
                .filter((entry): entry is [string, TreeFile | TreeDir] => entry !== null)
            ) ?? {},
        });
      }
      return this;
    } else {
      return null;
    }
  }
  isDupNode(): this is VirtualDupTreeNode {
    return isVirtualDupNode(this);
  }
  getMimeType() {
    return this.type === "dir" ? "dir" : getMimeType(this.path);
  }
  isHidden(): boolean {
    return this.parent?.isHidden() || this.basename.startsWith(".");
  }
  closestDir(): TreeDir | null {
    return this.isTreeDir() ? this : (this.parent?.closestDir() ?? null);
  }
  siblings(filterIn: (() => boolean) | AbsPath[] = () => true): TreeNode[] {
    const filterFn = Array.isArray(filterIn) ? (node: TreeNode) => filterIn.includes(node.path) : filterIn;
    return this.parent ? Object.values(this.parent.children).filter((child) => child !== this && filterFn(child)) : [];
  }
  closestDirPath(): AbsPath {
    return this.isTreeDir() ? this.path : dirname(this.path);
  }
  isMarkdownFile() {
    if (this.isTreeDir()) return false;
    return isMarkdown(this.path);
  }
  isEjsFile() {
    if (this.isTreeDir()) return false;
    return isEjs(this.path);
  }
  isHtmlFile() {
    if (this.isTreeDir()) return false;
    return isHtml(this.path);
  }
  isTextFile() {
    if (this.isTreeDir()) return false;
    return isText(this.path);
  }
  isCssFile() {
    if (this.isTreeDir()) return false;
    return isCss(this.path);
  }
  isImageFile() {
    if (this.isTreeDir()) return false;
    return isImage(this.path);
  }
  toString() {
    return this.path;
  }
  hasChildren(): boolean {
    return this.isTreeDir() && Object.keys(this.children ?? {}).length > 0;
  }
  get str() {
    return this.toString();
  }

  static FromPath(path: AbsPath, type: "dir" | "file", parent: TreeDir | null = null) {
    const pathDirname = absPath(dirname(path));
    const pathBasename = relPath(basename(path));
    const pathDepth = getDepth(path);
    return type === "dir"
      ? new TreeDir({
          dirname: pathDirname,
          basename: pathBasename,
          path,
          depth: pathDepth,
          parent,
          children: {},
        })
      : new TreeFile({ dirname: pathDirname, basename: pathBasename, path, depth: pathDepth, parent });
  }

  replaceWith(newNode: TreeNode) {
    this.type = newNode.type;
    this.path = newNode.path;
    this.depth = newNode.depth;
    this.parent = newNode.parent;
    this.children = newNode.children;
    this.isVirtual = newNode.isVirtual;
    this.source = newNode.source;
  }

  async asyncWalk(
    cb: (node: TreeNode, depth: number, exit: () => void) => Promise<void>,
    node: TreeNode = this,
    depth = 0,
    status = { exit: false }
  ): Promise<void> {
    const exit = () => (status.exit = true);
    await cb(node, depth, exit);
    for (const childNode of Object.values((node as TreeDir).children ?? {})) {
      if (status.exit) break;
      await this.asyncWalk(cb, childNode, depth + 1, status);
    }
  }

  async *asyncWalkIterator(node: TreeNode = this, depth = 0): AsyncIterableIterator<TreeNode> {
    for (const childNode of Object.values((node as TreeDir).children ?? {})) {
      yield* await childNode.asyncWalkIterator(childNode, depth + 1);
    }
  }

  iterator(filter?: (n: TreeNode) => boolean): IterableIterator<this> {
    function* gen(node: TreeNode): IterableIterator<unknown> {
      if (!filter || filter(node)) yield node;
      // if (node.isTreeFile()) return node;
      for (const childNode of Object.values((node as TreeDir).children ?? {})) {
        yield* gen.bind(node)(childNode);
      }
    }
    return gen.bind(this)(this) as IterableIterator<this>;
  }

  walk(
    cb: (node: TreeNode, depth: number, exit: () => void) => void,
    node: TreeNode = this,
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
  constructor({
    type,
    dirname,
    basename,
    path,
    parent,
    depth,
    source,
  }: {
    type: "dir" | "file";
    dirname: AbsPath | string;
    basename: RelPath | string;
    parent: TreeDir | null;
    path: AbsPath | string;
    depth?: number;
    source?: AbsPath;
  }) {
    this.type = type;
    this._dirname = typeof dirname === "string" ? absPath(dirname) : dirname;
    this._basename = typeof basename === "string" ? relPath(basename) : basename;
    this._path = typeof path === "string" ? absPath(path) : path;
    this.depth = typeof depth !== "undefined" ? depth : getDepth(this._path);
    this.parent = parent;
    this.source = source;
    // if (isTreeFile(this)) return this;
    // if (isTreeDir(this)) return this;
  }

  remove() {
    if (this.parent && this.basename in this.parent.children) {
      delete this.parent.children[this.basename];
      return true;
    }
    return false;
  }
  private adjustChildrenPaths(): this {
    if (this.isTreeDir()) {
      for (const child of Object.values(this.children ?? {})) {
        child.dirname = this._path;
      }
    }
    return this;
  }

  inc() {
    this.path = incPath(this.path);
    return this;
  }
  renamePrefix(newBasename: RelPath | string) {
    this.basename = relPath(prefix(relPath(newBasename)) + extname(this.basename));
    return this;
  }
  renameStrictPrefix(newBasename: RelPath | string) {
    this.basename = relPath(strictPrefix(relPath(newBasename)) + extname(this.basename));
    return this;
  }
  rename(path: AbsPath) {
    this.path = path;
    return this;
  }
  deepCopy(): TreeNode {
    if (isTreeDir(this)) {
      return new TreeDir({
        dirname: this.dirname,
        basename: this.basename,
        parent: this.parent,
        path: this.path,
        depth: this.depth,
        source: this.source,
        children: Object.fromEntries(
          Object.entries(this.children ?? {}).map(([key, child]) => [key, child.deepCopy()])
        ),
      } as TreeDir & { children: Record<string, TreeNode> });
    }
    return new TreeFile({
      dirname: this.dirname,
      basename: this.basename,
      parent: this.parent,
      path: this.path,
      depth: this.depth,
      source: this.source,
    });
  }

  isSourceNode(): this is SourceTreeNode {
    return typeof this.source === "string" && this.source.length > 0;
  }
  splice(newParent: TreeDir): SourceDirTreeNode | SourceFileTreeNode {
    const clone = this.deepCopy();
    const stn = SourceTreeNode.New(clone, clone.path);
    stn.path = absPath(joinPath(newParent.path, clone.basename));
    stn.parent = newParent;
    return stn;
  }

  copy(): TreeNode {
    if (isTreeDir(this)) {
      return new TreeDir({
        dirname: this.dirname,
        basename: this.basename,
        parent: this.parent,
        path: this.path,
        depth: this.depth,
        children: this.children ?? {},
        source: this.source,
      });
    }
    return new TreeFile({
      dirname: this.dirname,
      basename: this.basename,
      parent: this.parent,
      path: this.path,
      depth: this.depth,
      source: this.source,
    });
  }
  static FromJSON(json: TreeFileJType | TreeNodeDirJType, parent: TreeDir | null = null): TreeFile | TreeDir {
    if (json.type === "dir") {
      return TreeDir.FromJSON(json as TreeNodeDirJType, parent);
    }
    if (json.type === "file") {
      return TreeFile.FromJSON(json as TreeFileJType, parent);
    }
    throw new Error(`Unknown TreeNode type`);
  }
  isTreeDir(): this is TreeDir {
    return this.type === "dir";
  }
  isTreeFile(): this is TreeFile {
    return this.type === "file";
  }
  toJSON(): {
    type: "dir" | "file";
    dirname: string;
    basename: string;
    path: string;
    depth: number;
  } {
    return {
      type: this.type,
      dirname: this.dirname,
      basename: this.basename,
      path: this.path,
      depth: this.depth,
    };
  }
}

export class TreeDir extends TreeNode {
  type = "dir" as const;
  _children: Record<string, TreeFile | TreeDir> = {};

  static sortOrder = (n: TreeNode) => [
    n.isTreeDir() ? 0 : 1,
    n.isImageFile() ? 0 : 1,
    n.isMarkdownFile() ? 0 : 1,
    n.isTextFile() ? 0 : 1,
    n.basename.toLowerCase(),
  ];
  //@ts-ignore
  get children() {
    return this._children;
  }

  set children(value: Record<string, TreeFile | TreeDir>) {
    // Convert to entries so we can sort
    const entries = Object.entries(value);

    // Sort using the sortOrder tuple
    entries.sort(([, aNode], [, bNode]) => {
      const keyA = TreeDir.sortOrder(aNode);
      const keyB = TreeDir.sortOrder(bNode);

      for (let i = 0; i < keyA.length; i++) {
        if (typeof keyA[i] === "string" && typeof keyB[i] === "string") {
          const cmp = (keyA[i] as string).localeCompare(keyB[i] as string);
          if (cmp !== 0) return cmp;
        } else {
          if (keyA[i]! < keyB[i]!) return -1;
          if (keyA[i]! > keyB[i]!) return 1;
        }
      }
      return 0;
    });

    // Rebuild the object in sorted order
    this._children = Object.fromEntries(entries);

    // Set parent references
    for (const child of Object.values(this._children)) {
      child.parent = this;
    }
  }

  constructor({
    dirname,
    basename,
    path,
    depth,
    children = {},
    parent,
    source,
  }: {
    dirname: AbsPath;
    basename: RelPath;
    parent: TreeDir | null;
    path: AbsPath;
    depth: number;
    source?: AbsPath;
    children: TreeDir["children"];
  }) {
    super({ type: "dir", dirname, parent, basename, path, depth, source });
    this.children = children;
  }

  //mutates
  pruneMutate(filterOut?: ((n: TreeNode) => boolean) | AbsPath[]): this {
    if (!filterOut) return this;
    const filterFn = Array.isArray(filterOut) ? (node: TreeNode) => filterOut.includes(node.path) : filterOut;
    for (const [key, child] of Object.entries(this.children)) {
      if (filterFn(child)) {
        delete this.children[key];
      } else if (child.isTreeDir()) {
        child.pruneMutate(filterOut);
      }
    }
    return this;
  }

  prune(filterOut: ((n: TreeNode) => boolean) | AbsPath[]): TreeDir {
    // const maxDepth = Array.isArray(filterOut) ? Math.max(...filterOut.map((path) => getDepth(path))) : Infinity;
    const filterFn = Array.isArray(filterOut) ? (node: TreeNode) => filterOut.includes(node.path) : filterOut;
    const newChildren: Record<string, TreeFile | TreeDir> = {};

    for (const [key, child] of Object.entries(this.children)) {
      if (!filterFn(child)) {
        if (child?.isTreeDir()) {
          newChildren[key] = child.prune(filterOut);
        } else {
          newChildren[key] = child;
        }
      }
    }

    return new TreeDir({
      dirname: this.dirname,
      basename: this.basename,
      path: this.path,
      depth: this.depth,
      parent: this.parent,
      source: this.source,
      children: newChildren,
    });
  }
  filterOutChildren(filter?: ((node: TreeNode) => boolean) | AbsPath[]): Record<string, TreeFile | TreeDir> {
    if (!filter) {
      return this.children ?? {};
    }
    if (Array.isArray(filter)) {
      return (
        Object.fromEntries(Object.entries(this.children).filter(([_, child]) => !filter.includes(child.path))) ?? {}
      );
    }
    return Object.fromEntries(Object.entries(this.children).filter(([_, child]) => filter(child))) ?? {};
  }

  toJSON(): TreeNodeDirJType {
    return {
      ...super.toJSON(),
      type: "dir",
      children: Object.fromEntries(
        Object.entries(this.children).map(([key, child]) => [key, child.toJSON() as TreeNodeDirJType | TreeFileJType])
      ),
    };
  }

  static FromJSON(json: TreeNodeDirJType, parent: TreeDir | null = null): TreeDir {
    const parentNode = new TreeDir({
      dirname: absPath(json.dirname),
      basename: relPath(json.basename),
      path: absPath(json.path),
      depth: json.depth,
      parent,
      children: {},
    });
    parentNode.children = Object.fromEntries(
      Object.entries(json.children).map(([key, child]) => [key, TreeNode.FromJSON(child, parentNode)])
    );

    return parentNode;
  }
}

export class TreeDirRoot extends TreeDir {
  id = Date.now();
  type = "dir" as const;
  constructor({ children = {} }: { children: TreeDir["children"] } = { children: {} }) {
    super({
      dirname: absPath("/"),
      basename: relPath(":root"),
      path: absPath("/"),
      depth: 0,
      children,
      parent: null,
    });
  }
  hasDepth() {
    return Object.values(this.children).filter((n) => n.isTreeDir()).length > 0;
  }
  trash() {
    return new TreeDirRoot({
      ...this,
      children: Object.fromEntries(
        Object.entries(this.children).filter(([_, child]) => child.path === SpecialDirs.Trash)
      ),
    });
  }
  excludeHidden() {
    return new TreeDirRoot({
      ...this,
      children: Object.fromEntries(Object.entries(this.children).filter(([_, child]) => !child.isHidden())),
    });
  }

  isEmpty() {
    return Object.keys(this.children).length === 0;
  }

  toJSON() {
    return {
      ...super.toJSON(),
    };
  }

  static FromJSON(json: TreeNodeDirJType): TreeDirRoot {
    return new TreeDirRoot(TreeDir.FromJSON(json));
  }
}

export function isTreeFile(node: TreeNode): node is TreeFile {
  return node.type === "file";
}
export function isTreeDir(node: TreeNode): node is TreeDir {
  return node.type === "dir";
}
export class TreeFile extends TreeNode {
  type = "file" as const;

  constructor({
    dirname,
    basename,
    path,
    depth,
    parent,
    source,
  }: {
    dirname: AbsPath;
    basename: RelPath;
    path: AbsPath;
    depth: number;
    parent: TreeDir | null;
    source?: AbsPath;
  }) {
    super({ type: "file", parent, dirname, basename, path, depth, source });
  }
  static FromJSON(json: TreeFileJType, parent: TreeDir | null = null): TreeFile {
    return new TreeFile({
      dirname: absPath(json.dirname),
      basename: relPath(json.basename),
      path: absPath(json.path),
      depth: json.depth,
      parent: parent,
    });
  }
}

export type TreeList = Array<string>;

function tagSource<T extends TreeNode>(this: T, sourceNode: TreeNode) {
  this.source = sourceNode.path;
  return this;
}

export class VirtualTreeNode extends TreeNode {
  isVirtual = true;
  tagSource = tagSource<VirtualTreeNode>;
}
export class VirtualFileTreeNode extends TreeFile {
  isVirtual = true;
  tagSource = tagSource<VirtualTreeNode>;
}
export class VirtualDirTreeNode extends TreeDir {
  isVirtual = true;
  tagSource = tagSource<VirtualTreeNode>;
}

export function isVirtualNode(node: TreeNode): node is VirtualTreeNode {
  return typeof node.isVirtual === "boolean" && node.isVirtual !== false;
}

export class VirtualDupTreeNode extends VirtualTreeNode {
  source!: AbsPath;
}

export function isVirtualDupNode(node: TreeNode): node is VirtualDupTreeNode {
  return isVirtualNode(node) && typeof node.source !== "undefined";
}

export class SourceTreeNode extends TreeNode {
  static New(node: TreeNode, source: AbsPath): SourceDirTreeNode | SourceFileTreeNode {
    if (isTreeDir(node)) {
      return new SourceDirTreeNode(node, source);
    }
    return new SourceFileTreeNode(node, source);
  }
  constructor(
    props: ConstructorParameters<typeof TreeNode>[0],
    public source: AbsPath
  ) {
    super(props);
  }
}
export class SourceFileTreeNode extends TreeFile {
  constructor(
    props: ConstructorParameters<typeof TreeFile>[0],
    public source: AbsPath
  ) {
    super(props);
  }
}
export class SourceDirTreeNode extends TreeDir {
  get children(): Record<string, SourceFileTreeNode | SourceDirTreeNode> {
    return this._children as Record<string, SourceFileTreeNode | SourceDirTreeNode>;
  }

  set children(value: Record<string, SourceFileTreeNode | SourceDirTreeNode>) {
    super.children = value as Record<string, TreeFile | TreeDir>;
  }

  constructor(
    props: ConstructorParameters<typeof TreeDir>[0],
    public source: AbsPath
  ) {
    super(props);
    this.children = Object.fromEntries(
      Object.entries(props.children).map(([key, child]) => [key, SourceTreeNode.New(child, child.path)])
    );
  }
}

export const RootNode = TreeNode.FromPath(absPath("/"), "dir");

export const NULL_TREE_ROOT = new TreeDirRoot();
