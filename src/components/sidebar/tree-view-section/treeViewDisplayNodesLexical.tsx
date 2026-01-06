import { Thumb } from "@/data/Thumb";
import { absPath, basename } from "@/lib/paths2";
import { $isHeadingNode, HeadingNode } from "@lexical/rich-text";

import { $isImageNode, lexical } from "@mdxeditor/editor";
let nodeIdCounter = 0;
function generateUniqueId(): string {
  return `view-node-${nodeIdCounter++}`;
}

export interface LexicalTreeViewNode {
  id: string;
  type: string;
  depth?: number;
  displayText?: string | React.ReactElement;
  children?: LexicalTreeViewNode[];

  lexicalNodeId: string;

  isContainer?: boolean;
}
export function isLeaf(node: LexicalTreeViewNode) {
  return node.isContainer === false;
}
export function isContainer(node: LexicalTreeViewNode) {
  return node.isContainer === true;
}

function getLexicalTextContent(node: lexical.LexicalNode): string {
  if (lexical.$isElementNode(node)) {
    return node.getTextContent();
  } else {
    return node.getType();
  }
}
function convertLexicalContentNode(
  lexicalNode: lexical.ElementNode,
  currentDepth: number,
  maxLength: number
): LexicalTreeViewNode | null {
  const displayText = getLexicalTextContent(lexicalNode);
  const truncatedText = displayText.length > maxLength ? `${displayText.slice(0, maxLength)}...` : displayText;

  const viewNode: LexicalTreeViewNode = {
    id: `view-${lexicalNode.getKey()}`, // Use lexical key for stable IDs
    type: lexicalNode.getType(),
    depth: currentDepth,
    displayText: truncatedText,
    lexicalNodeId: lexicalNode.getKey(),
    isContainer: false,
  };

  switch (lexicalNode.getType()) {
    case "list":
      viewNode.isContainer = true;
      viewNode.displayText = "[list]";
      viewNode.children = (lexicalNode.getChildren() as lexical.ElementNode[])
        .map((child) => convertLexicalContentNode(child, currentDepth + 1, maxLength))
        .filter((n): n is LexicalTreeViewNode => n !== null);
      break;
    case "paragraph":
      viewNode.isContainer = true;
      viewNode.displayText = (
        <span
          title={displayText}
          className="text-xs truncate whitespace-nowrap w-full block text-gray-600"
        >
          {truncatedText || "[empty paragraph]"}
        </span>
      );
      viewNode.children = (lexicalNode.getChildren() as lexical.ElementNode[])
        .map((child) => convertLexicalContentNode(child, currentDepth + 1, maxLength))
        .filter((n): n is LexicalTreeViewNode => n !== null);
      break;

    case "image":
      if ($isImageNode(lexicalNode)) {
        viewNode.displayText = (
          <span title={displayText} className="text-xs flex justify-center items-center truncate w-full ">
            <img
              src={Thumb.pathToURL({ path: absPath(lexicalNode.getSrc()) })}
              alt={lexicalNode.getSrc()}
              className="mr-2 h-4 w-4 flex-shrink-0 border  border-background object-cover"
            />
            <span className="truncate w-full text-2xs">{`${basename(lexicalNode.getSrc())}`}</span>
          </span>
        );
      } else {
        viewNode.displayText = (
          <span title={displayText} className="text-xs">
            {`[image]`}
          </span>
        );
      }
      viewNode.isContainer = false;
      break;
    case "listitem":
      viewNode.isContainer = true;
      viewNode.displayText = `∙ ${truncatedText}`;
      if (lexicalNode.getChildren()?.some((child) => child.getType() === "list")) {
        viewNode.children = lexicalNode
          .getChildren()
          .filter((child) => child.getType() === "list") // Only include nested lists
          .map((child) => convertLexicalContentNode(child as lexical.ElementNode, currentDepth + 1, maxLength))
          .filter((n): n is LexicalTreeViewNode => n !== null);
      }
      break;

    case "code":
    case "blockquote":
      break;

    default:
      return null;
  }

  return viewNode;
}

export function lexicalToTreeView(
  lexicalRoot: lexical.RootNode,
  maxHeadingLevel = 6,
  maxLength = 32
): LexicalTreeViewNode {

  const rootTreeViewNode: LexicalTreeViewNode = {
    id: `view-${lexicalRoot.getKey()}`, // Use lexical key for stable IDs
    type: "root",
    displayText: "[document]",
    depth: 0,
    isContainer: true,
    children: [],
    lexicalNodeId: lexicalRoot.getKey(),
  };

  const stack: LexicalTreeViewNode[] = [rootTreeViewNode];

  for (const lexicalNode of lexicalRoot.getChildren<lexical.ElementNode & HeadingNode>()) {
    if (!lexicalNode.getChildrenSize?.()) {
      continue;
    }

    const currentParent = stack.at(-1);

    if (currentParent && $isHeadingNode(lexicalNode as any)) {
      const headingNode = lexicalNode;
      const level = parseInt(headingNode.getTag().substring(1), 10);

      if (level > maxHeadingLevel) {
        const contentNode = convertLexicalContentNode(headingNode, (currentParent.depth || 0) + 1, maxLength);
        if (contentNode) {
          currentParent.children?.push(contentNode);
        }
        continue;
      }

      while (stack.length > 1 && level <= (stack[stack.length - 1]?.depth ?? 0)) {
        stack.pop();
      }

      const newParent = stack[stack.length - 1]!;

      const sectionNode: LexicalTreeViewNode = {
        id: `view-${headingNode.getKey()}`, // Use lexical key for stable IDs
        type: "section",
        depth: level,
        displayText: getLexicalTextContent(headingNode),
        lexicalNodeId: headingNode.getKey(),
        isContainer: true,
        children: [],
      };

      newParent.children?.push(sectionNode);
      stack.push(sectionNode);
    } else {
      const contentNode = convertLexicalContentNode(lexicalNode, (currentParent?.depth || 0) + 1, maxLength);
      if (contentNode) {
        currentParent?.children?.push(contentNode);
      }
    }
  }

  return rootTreeViewNode;
}
