import { FileTree } from "@/components/filetree/Filetree";
import { TreeFile, TreeNode } from "@/components/filetree/TreeNode";

export function updateAbsoluteUrlsInHtmlContent(content: string, baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, ""); // normalize (no trailing slash)
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "text/html");

  const attrsToUpdate = ["href", "src", "srcset", "poster", "data-src"];

  for (const attr of attrsToUpdate) {
    const elements = doc.querySelectorAll(`[${attr}]`);
    elements.forEach((el) => {
      const value = el.getAttribute(attr);
      if (!value) return;

      // skip fully-qualified URLs and anchors
      if (
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("//") ||
        value.startsWith("#")
      )
        return;

      if (value.startsWith("/")) el.setAttribute(attr, `${base}${value}`);
    });
  }

  // Serialize the document back to a string — includes <html>, <head>, <body>, etc.
  return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
}
export function updateFileNodeContents(node: TreeFile, cb: (contents: string) => string): Promise<void> {
  return node.read().then((data) => {
    const updatedContent = cb(data.toString());
    return node.write(updatedContent);
  });
}
export function findHtmlFilesInTree(tree: FileTree): TreeNode[] {
  const htmlFiles: TreeNode[] = [];
  for (const node of tree.iterator()) {
    if (node.isTreeFile() && node.path.endsWith(".html")) {
      htmlFiles.push(node);
    }
  }
  return htmlFiles;
}
