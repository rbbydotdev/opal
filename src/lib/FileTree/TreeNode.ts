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
  name: RelPath;
  type: "dir" | "file";
  dirname: AbsPath;
  basename: RelPath;
  parent: TreeDir | null;
  path: AbsPath;
  depth: number;
  children?: Record<string, TreeNode>;

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
  closestDirPath(): AbsPath {
    return this.isTreeDir() ? this.path : dirname(this.path);
  }
  isMarkdownFile() {
    return this.getMimeType() === "text/markdown";
  }
  isTextFile() {
    return this.getMimeType().startsWith("text/");
  }
  isCssFile() {
    return this.getMimeType() === "text/css";
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
    const name = relPath(basename(path));
    const pathDirname = absPath(dirname(path));
    const pathBasename = relPath(basename(path));
    const pathDepth = getDepth(path);
    return type === "dir"
      ? new TreeDir({
          name,
          dirname: pathDirname,
          basename: pathBasename,
          path,
          depth: pathDepth,
          parent,
          children: {},
        })
      : new TreeFile({ name, dirname: pathDirname, basename: pathBasename, path, depth: pathDepth, parent });
  }

  replaceWith(newNode: TreeNode) {
    this.name = newNode.name;
    this.type = newNode.type;
    this.dirname = newNode.dirname;
    this.basename = newNode.basename;
    this.path = newNode.path;
    this.depth = newNode.depth;
    this.parent = newNode.parent;
    this.children = newNode.children;
    this.isVirtual = newNode.isVirtual;
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

  iterator(filter?: (n: TreeNode) => boolean): IterableIterator<TreeNode> {
    function* gen(node: TreeNode): IterableIterator<TreeNode> {
      if (!filter || filter(node)) yield node;
      for (const childNode of Object.values((node as TreeDir).children ?? {})) {
        yield* gen.bind(node)(childNode);
      }
    }
    return gen.bind(this)(this);
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
    name,
    type,
    dirname,
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
    path: AbsPath | string;
    depth?: number;
  }) {
    this.name = typeof name === "string" ? relPath(name) : name;
    this.type = type;
    this.dirname = typeof dirname === "string" ? absPath(dirname) : dirname;
    this.basename = typeof basename === "string" ? relPath(basename) : basename;
    this.path = typeof path === "string" ? absPath(path) : path;
    this.depth = typeof depth !== "undefined" ? depth : getDepth(this.path);
    this.parent = parent;
    if (isTreeFile(this)) return this;
    if (isTreeDir(this)) return this;
  }

  remove() {
    if (this.parent && this.name in this.parent.children) {
      delete this.parent.children[this.name];
      return true;
    }
    return false;
  }

  inc() {
    this.path = incPath(this.path);
    this.dirname = absPath(dirname(this.path));
    this.name = relPath(basename(this.path));
    this.basename = relPath(basename(this.path));
    return this;
  }
  renamePrefix(newBasename: RelPath | string) {
    this.basename = relPath(prefix(relPath(newBasename)) + extname(this.basename));
    this.name = relPath(this.basename);
    this.path = absPath(joinPath(this.dirname, this.basename));
    return this;
  }
  renameStrictPrefix(newBasename: RelPath | string) {
    this.basename = relPath(strictPrefix(relPath(newBasename)) + extname(this.basename));
    this.name = relPath(this.basename);
    this.path = absPath(joinPath(this.dirname, this.basename));
    return this;
  }
  rename(path: AbsPath) {
    this.path = path;
    this.dirname = absPath(dirname(this.path));
    this.name = relPath(basename(this.path));
    this.basename = relPath(basename(this.path));
    return this;
  }
  deepCopy(): TreeNode {
    if (isTreeDir(this)) {
      return new TreeDir({
        name: this.name,
        dirname: this.dirname,
        basename: this.basename,
        parent: this.parent,
        path: this.path,
        depth: this.depth,
        children: Object.fromEntries(
          Object.entries(this.children ?? {}).map(([key, child]) => [key, child.deepCopy()])
        ),
      } as TreeDir & { children: Record<string, TreeNode> });
    }
    return new TreeFile({
      name: this.name,
      dirname: this.dirname,
      basename: this.basename,
      parent: this.parent,
      path: this.path,
      depth: this.depth,
    });
  }

  copy() {
    if (isTreeDir(this)) {
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
      parent: this.parent,
      path: this.path,
      depth: this.depth,
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
    name: string;
    type: "dir" | "file";
    dirname: string;
    basename: string;
    path: string;
    depth: number;
  } {
    return {
      name: this.name,
      type: this.type,
      dirname: this.dirname,
      basename: this.basename,
      path: this.path,
      depth: this.depth,
    };
  }
}

export class TreeDir extends TreeNode {
  children: Record<string, TreeFile | TreeDir> = {};
  type = "dir" as const;

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

  //mutates
  pruneMutate(filterOut: ((n: TreeNode) => boolean) | AbsPath[]): this {
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
      name: this.name,
      dirname: this.dirname,
      basename: this.basename,
      path: this.path,
      depth: this.depth,
      parent: this.parent,
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
      ...TreeNode.FromJSON({ ...json, type: "file" }),
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
      name: relPath(":root"),
      dirname: absPath("/"),
      basename: relPath(":root"),
      path: absPath("/"),
      depth: 0,
      children,
      parent: null,
    });
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
  static FromJSON(json: TreeFileJType, parent: TreeDir | null = null): TreeFile {
    return new TreeNode({ ...json, parent: parent }) as TreeFile;
  }
}

export type TreeList = Array<string>;

export class VirtualTreeNode extends TreeNode {
  isVirtual = true;
  tagSource(sourceNode: TreeNode) {
    this.source = sourceNode.path;
    return this as VirtualDupTreeNode;
  }
}
export class VirtualFileTreeNode extends TreeFile {
  isVirtual = true;
  tagSource(sourceNode: TreeNode) {
    this.source = sourceNode.path;
    // replaceNde/
    return this as VirtualDupTreeNode;
  }
}
export class VirtualDirTreeNode extends TreeDir {
  isVirtual = true;
  tagSource(sourceNode: TreeNode) {
    this.source = sourceNode.path;
    return this as VirtualDupTreeNode;
  }
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

export const RootNode = TreeNode.FromPath(absPath("/"), "dir");

export const NULL_TREE_ROOT = new TreeDirRoot();
