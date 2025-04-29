import { getMimeType } from "@/lib/mimeType";
import { AbsPath, absPath, RelPath, relPath } from "@/lib/paths";

export type TreeNodeJType = ReturnType<TreeNode["toJSON"]> & {
  type: "file";
};
export type TreeNodeDirJType = ReturnType<TreeNode["toJSON"]> & {
  children: Record<string, TreeNodeJType | TreeNodeDirJType>;
  type: "dir";
};

export class TreeNode {
  isVirtual = false;
  name: RelPath;
  type: "dir" | "file";
  dirname: AbsPath;
  mimeType?: string;
  eTag?: string;
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

  replaceWith(newNode: TreeNode) {
    this.name = newNode.name;
    this.type = newNode.type;
    this.dirname = newNode.dirname;
    this.basename = newNode.basename;
    this.path = newNode.path;
    this.mimeType = newNode.mimeType;
    this.eTag = newNode.eTag;
    this.depth = newNode.depth;
    this.parent = newNode.parent;
    this.children = newNode.children;
    this.isVirtual = newNode.isVirtual;
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
    mimeType,
    basename,
    path,
    parent,
    eTag,
    depth,
  }: {
    name: RelPath | string;
    type: "dir" | "file";
    dirname: AbsPath | string;
    basename: RelPath | string;
    parent: TreeDir | null;
    mimeType?: string;
    eTag?: string;
    path: AbsPath | string;
    depth: number;
  }) {
    this.name = typeof name === "string" ? relPath(name) : name;
    this.type = type;
    this.mimeType = mimeType;
    this.eTag = eTag;
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
    if (isTreeDir(this)) {
      return new TreeDir({
        name: this.name,
        dirname: this.dirname,
        basename: this.basename,
        parent: this.parent,
        path: this.path,
        depth: this.depth,
        children: this.children ?? {}, //TODO this is not a real copy!
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
  static fromJSON(json: TreeNodeJType | TreeNodeDirJType, parent: TreeDir | null = null): TreeNode {
    if (json.type === "dir") {
      return TreeDir.fromJSON(json as TreeNodeDirJType, parent);
    }
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

  toJSON() {
    return {
      ...super.toJSON(),
      children: Object.fromEntries(Object.entries(this.children).map(([key, child]) => [key, child.toJSON()])),
    };
  }

  static fromJSON(json: TreeNodeDirJType, parent: TreeDir | null = null): TreeDir {
    const parentNode = new TreeDir({ ...TreeNode.fromJSON({ ...json, type: "file" }), parent, children: {} });
    const children = Object.entries(json.children).reduce((acc, [key, child]) => {
      acc[key] = child.type === "file" ? TreeNode.fromJSON(child, parentNode) : TreeDir.fromJSON(child, parentNode);
      return acc;
    }, {} as Record<string, TreeNode>);
    parentNode.children = children;
    return parentNode;
  }
}

export class TreeDirRoot extends TreeDir {
  id = Date.now();
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
export class VirtualFileTreeNode extends TreeFile {
  isVirtual = true;
}
export class VirtualDirTreeNode extends TreeDir {
  isVirtual = true;
}
