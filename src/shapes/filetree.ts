import { absPath } from "@/lib/paths";

export type TreeFile = {
  name: string;
  type: "file";
  path: string;
  href: string;
};

export type TreeNode = TreeDir | TreeFile;

export type TreeList = Array<string>;

export type TreeDir = {
  children: Array<TreeNode>;
  name: string;
  type: "dir";
  path: string;
};

export function fileListToTree(fileList: string[]) {
  const root: TreeDir = {
    name: ".",
    path: ".",
    children: [],
    type: "dir",
  };

  for (const file of fileList) {
    const segments = file.split("/").filter(Boolean);
    let node: TreeNode = root;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const path = segments.slice(0, i + 1).join("/");

      node = node as TreeDir; // Assert node is a TreeDir

      if (i === segments.length - 1) {
        // Last segment, create a file
        node.children.push({
          type: "file",
          path,
          name: segment,
          href: absPath("/workspace/mywrkspc").join(path).str,
        });
        break;
      }

      let childNode = node.children.find((n) => n.name === segment);

      if (!childNode) {
        // Create a new directory if it does not exist
        childNode = {
          name: segment,
          type: "dir",
          path,
          children: [],
        };
        node.children.push(childNode);
      }

      node = childNode;
    }
  }

  return root;
}

export type FileTreeJType = ReturnType<typeof FileTree.prototype.toJSON>;

export class FileTree {
  tree = {} as TreeDir;

  constructor(tree: TreeList | TreeDir, public id = "filetree_id") {
    if (Array.isArray(tree)) {
      this.tree = fileListToTree(tree);
    } else {
      this.tree = tree;
    }
  }

  walk(fn: (n: TreeNode, depth?: number) => unknown, node = this.tree, depth = 0) {
    node.children.forEach((child) => {
      fn(child, depth);
      if (child.type === "dir") {
        this.walk(fn, child, depth + 1);
      }
    });
  }

  get root() {
    return this.tree;
  }

  get children() {
    return this.tree.children;
  }

  // Method to serialize the FileTree instance to a JSON object
  toJSON() {
    return {
      tree: this.tree,
      id: this.id,
    };
  }

  // Static method to create a FileTree instance from a JSON object
  static fromJSON(json: { tree: TreeDir; id: string }): FileTree {
    return new FileTree(json.tree, json.id);
  }
}
