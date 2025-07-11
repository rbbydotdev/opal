import { getMimeType } from "@/lib/mimeType";
import { AbsPath, RelPath, absPath, basename, dirname, depth as getDepth, incPath, relPath } from "@/lib/paths2";

export type TreeFileJType = ReturnType<TreeNode["toJSON"]> & {
  type: "file";
};

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
    return this.isTreeDir() ? this : this.parent?.closestDir() ?? null;
  }
  closestDirPath(): AbsPath {
    return this.isTreeDir() ? this.path : dirname(this.path);
  }
  isMarkdownFile() {
    return this.getMimeType() === "text/markdown";
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
  rename(path: AbsPath) {
    this.path = path;
    this.dirname = absPath(dirname(this.path));
    this.name = relPath(basename(this.path));
    this.basename = relPath(basename(this.path));
    return this;
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

  withFilterOutChildren(filter?: ((node: TreeNode) => boolean) | AbsPath[]): TreeDir {
    return new TreeDir({
      ...this,
      children: this.filterOutChildren(filter),
    });
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
      children: Object.fromEntries(Object.entries(this.children).filter(([_, child]) => child.path === "/.trash")),
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
