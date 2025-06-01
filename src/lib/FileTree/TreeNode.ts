// import { MimeType, MimeTypes } from "@/lib/fileType";
// import { getMimeType } from "@/lib/mimeType";
import { AbsPath, RelPath, absPath, basename, dirname, depth as getDepth, incPath, relPath } from "@/lib/paths2";

export type TreeNodeJType = ReturnType<TreeNode["toJSON"]> & {
  type: "file";
};

export type TreeDirRootJType = TreeNodeDirJType; //ReturnType<TreeDirRoot["toJSON"]>;

export type TreeNodeDirJType = ReturnType<TreeNode["toJSON"]> & {
  children: Record<string, TreeNodeJType | TreeNodeDirJType>;
  type: "dir";
};

export class TreeNode {
  isVirtual = false;
  name: RelPath;
  type: "dir" | "file";
  dirname: AbsPath;
  basename: RelPath;
  parent: TreeDir | null;
  path: AbsPath;
  depth: number;
  children?: Record<string, TreeNode>;

  get length() {
    return (this.path as string).length;
  }
  toString() {
    return this.path as string;
  }
  get str() {
    return this.toString();
  }

  static FromPath(path: AbsPath, type: "dir" | "file", parent: TreeDir | null = null) {
    const name = relPath(basename(path));
    const pathDirname = absPath(dirname(path));
    const pathBasename = relPath(basename(path));
    const pathDepth = getDepth(path);
    return new TreeNode({ name, type, dirname: pathDirname, basename: pathBasename, path, depth: pathDepth, parent });
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
    // parent: TreeDir | null;
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
  }

  remove() {
    if (this.parent && (this.name as string) in this.parent.children) {
      delete this.parent.children[this.name as string];
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
  static fromJSON(json: TreeNodeJType | TreeNodeDirJType, parent: TreeDir | null = null): TreeNode {
    if (json.type === "dir") {
      return TreeDir.fromJSON(json as TreeNodeDirJType, parent);
    }
    return new TreeNode({
      ...json,
      parent,
      // mimeType: json.mimeType ? getMimeType(absPath(json.path)) : undefined,
    });
  }
  isTreeDir(): this is TreeDir {
    // return isTreeDir(this);
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
    // mimeType?: string;
    // parent: TreeNode["parent"];
    // eTag?: string;
  } {
    return {
      name: this.name as string,
      type: this.type,
      dirname: this.dirname as string,
      basename: this.basename as string,
      path: this.path as string,
      depth: this.depth,
      // mimeType: this.mimeType,
      // parent: this.parent,
      // eTag: this.eTag,
    };
  }
}

export class TreeDir extends TreeNode {
  children: Record<string, TreeNode>;
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

  toJSON(): TreeNodeDirJType {
    return {
      ...super.toJSON(),
      type: "dir",
      children: Object.fromEntries(
        Object.entries(this.children).map(([key, child]) => [key, child.toJSON() as TreeNodeDirJType | TreeNodeJType])
      ),
    };
  }

  static fromJSON(json: TreeNodeDirJType, parent: TreeDir | null = null): TreeDir {
    const parentNode = new TreeDir({
      ...TreeNode.fromJSON({ ...json, type: "file" }),
      parent,
      children: {},
    });
    parentNode.children = Object.fromEntries(
      Object.entries(json.children).map(([key, child]) => [key, TreeNode.fromJSON(child, parentNode)])
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

  isEmpty() {
    return Object.keys(this.children).length === 0;
  }

  toJSON() {
    return {
      ...super.toJSON(),
    };
  }

  static fromJSON(json: TreeNodeDirJType): TreeDirRoot {
    return new TreeDirRoot(TreeDir.fromJSON(json));
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
  // mimeType: MimeType = MimeTypes.MARKDOWN;

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

export class VirtualTreeNode extends TreeNode {
  isVirtual = true;
}
export class VirtualFileTreeNode extends TreeFile {
  isVirtual = true;
}
export class VirtualDirTreeNode extends TreeDir {
  isVirtual = true;
}
