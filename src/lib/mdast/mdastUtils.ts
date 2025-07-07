import mdast, { Root } from "mdast";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkSectionize from "remark-sectionize";
import { unified } from "unified";

export function isParent(node: unknown): node is mdast.Parent {
  return Boolean(typeof (node as mdast.Parent).children !== "undefined");
}

export function isChild(node: unknown): node is mdast.Node {
  return !isParent(node);
}

export type PositionedNode = mdast.Node & {
  position: {
    start: Required<Required<mdast.Node>["position"]["start"]>;
    end: Required<Required<mdast.Node>["position"]["end"]>;
  };
};

export function getTextContent(node: mdast.Node): string {
  if ("value" in node && typeof node.value === "string") {
    return node.value;
  } else if ("children" in node && Array.isArray((node as mdast.Parent).children)) {
    return ((node as mdast.Parent).children as mdast.Node[]).map(getTextContent).join("");
  }
  return "";
}

export function getMdastSync(source: string): Root {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkDirective);

  return processor.parse(source);
}

export function sectionize(mdastTree: Root): Root {
  return unified().use(remarkSectionize).runSync(mdastTree);
}
