export type TreeFile = {
  name: string;
  type: "file";
  path: string;
};

export type TreeNode = TreeDir | TreeFile;

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

export class FileTree {
  tree = {} as TreeDir;
  constructor(fileList: string[]) {
    this.tree = fileListToTree(fileList);
  }
  walk(fn: (n: TreeNode) => unknown, node = this.tree) {
    node.children.forEach((child) => {
      fn(child);
      if (child.type === "dir") {
        this.walk(fn, child);
      }
    });
  }
  get root() {
    return this.tree;
  }
  get children() {
    return this.tree.children;
  }
}
