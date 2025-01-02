import { FsType } from "@/disk/disk";
import { absPath } from "@/lib/paths";

export type TreeFile = {
  name: string;
  type: "file";
  path: string;
  depth: number;
};
type TreeType = "nested" | "flat";

abstract class FileTreeBase {
  abstract type: TreeType;
  root: TreeDir = {
    name: "/",
    path: "/",
    type: "dir",
    children: [],
    depth: 0,
  };
  tree: TreeDir | string[] = this.root;
  constructor(private fs: FsType, public id: string) {}

  // teardown() {
  //   this.tree = {} as any;
  //   this.root = {} as any;
  // }

  async build(type: TreeType = this.type) {
    if (type === "nested") {
      await this.recurseTree(this.root.path, this.root.children, type, 0);
      return this.root;
    } else {
      const parent: string[] = [];
      await this.recurseTree(this.root.path, parent, type, 0);
      return parent;
    }
  }

  walk(cb: (node: TreeNode, depth: number) => void, node: TreeNode = this.root, depth = 0) {
    cb(node, depth);
    if ((node as TreeDir).children) {
      (node as TreeDir).children.forEach((child) => this.walk(cb, child, depth + 1));
    }
  }

  get children() {
    return this.root.children;
  }

  recurseTree = async (
    dir: string,
    parent: (TreeNode | string)[] = [],
    type: "flat" | "nested" = "nested",
    depth = 0,
    haltOnError = false
  ) => {
    try {
      const entries = await this.fs.promises.readdir(dir);
      for (const entry of entries) {
        const fullPath = absPath(dir).join(entry.toString()).str;
        const stat = await this.fs.promises.stat(fullPath);
        let nextParent = null;
        let treeEntry: TreeDir | TreeFile | string = "";

        if (stat.isDirectory()) {
          if (type === "flat") {
            treeEntry = fullPath;

            nextParent = parent;
          } else {
            treeEntry = { name: entry.toString(), depth, type: "dir", path: fullPath, children: [] };
            nextParent = treeEntry.children;
          }
          await this.recurseTree(fullPath, nextParent, type, depth + 1, haltOnError);
        } else {
          if (type === "flat") {
            treeEntry = fullPath;
          } else {
            treeEntry = {
              name: entry.toString(),
              depth,
              type: "file",
              path: fullPath,
            };
          }
        }

        parent.push(treeEntry);
      }
      // return parent;
    } catch (err) {
      console.error(`Error reading ${dir}:`, err);
      if (haltOnError) {
        throw err;
      }
      // return parent;
    }
  };
}

export class FileTree extends FileTreeBase {
  type: TreeType = "nested";
}
export class FileTreeFlat extends FileTreeBase {
  type: TreeType = "flat";
}

export type TreeNode = TreeDir | TreeFile;

export type TreeList = Array<string>;

export type TreeDir = {
  children: Array<TreeNode>;
  name: string;
  type: "dir";
  path: string;
  depth: number;
};
