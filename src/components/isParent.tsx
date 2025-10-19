import mdast from "mdast";
import unist from "unist";

export function isParent(node: unknown): node is unist.Parent {
  return Boolean(typeof (node as mdast.Parent).children !== "undefined");
}
