import { $getEditor, $isElementNode, ElementNode } from "lexical";

function groupRange(range: number[]): number[][] {
  let currList: number[] = [];

  const groupedRange: number[][] = [];
  for (let i = 0; i < range.length; i++) {
    if ((range[i - 1] ?? Infinity) === range[i] - 1) {
      currList.push(range[i]);
    } else {
      currList = [range[i]];
      groupedRange.push(currList);
    }
  }
  return groupedRange;
}

//splices out text range of choice into seperate node: <TextNode?><TextNode_Match><TextNode?>
export class HighlightTransform {
  constructor() {}

  searchIndex(searchQuery: string, parent: ElementNode) {
    if (typeof Highlight !== "undefined") {
      CSS.highlights.delete("search");
      if (!parent || !$isElementNode(parent)) return;
      const parentHTMLNode = $getEditor().getElementByKey(parent.getKey());
      const ranges: Range[] = [];
      for (const pHTMLNode of parentHTMLNode?.querySelectorAll("p,h1,h2,h3,h4") ?? []) {
        const allTextNodes = [];
        let textNodeMap: Node[] = [];
        let offsetMap: number[] = [];
        let allText = "";
        const treeWalker = document.createTreeWalker(pHTMLNode, NodeFilter.SHOW_TEXT);
        let currentNode = treeWalker.nextNode();
        while (currentNode) {
          allTextNodes.push(currentNode);
          allText += currentNode.textContent ?? "";
          offsetMap = offsetMap.concat((currentNode.textContent ?? "").split("").map((_, i) => i));
          textNodeMap = textNodeMap.concat(new Array(currentNode.textContent?.length ?? 0).fill(currentNode));
          currentNode = treeWalker.nextNode();
        }

        const indices = [];
        let startPos = 0;
        while (startPos < allText.length) {
          const index = allText.indexOf(searchQuery, startPos);
          if (index === -1) break;
          indices.push(index);
          startPos = index + searchQuery.length;
        }
        for (const index of indices) {
          const range = new Range();
          range.setStart(textNodeMap[index], offsetMap[index]);
          range.setEnd(textNodeMap[index + searchQuery.length - 1], offsetMap[index + searchQuery.length - 1] + 1);
          ranges.push(range);
        }
        const highlight = new Highlight(...ranges.flat());
        CSS.highlights.set("search", highlight);
      }
    }
    // if (!parent || !$isElementNode(parent)) return;
    // const parentHTMLNode = $getEditor().getElementByKey(parent.getKey());
    // const treeWalker = document.createTreeWalker(parentHTMLNode!, NodeFilter.SHOW_TEXT);
    // const allTextNodes = [];
    // let textNodeMap: Node[] = [];
    // let offsetMap: number[] = [];
    // let allText = "";
    // let currentNode = treeWalker.nextNode();
    // while (currentNode) {
    //   console.log(currentNode?.parentElement?.innerText);
    //   allTextNodes.push(currentNode);
    //   allText += currentNode.textContent ?? "";
    //   offsetMap = offsetMap.concat((currentNode.textContent ?? "").split("").map((_, i) => i));
    //   textNodeMap = textNodeMap.concat(new Array(currentNode.textContent?.length ?? 0).fill(currentNode));
    //   currentNode = treeWalker.nextNode();
    // }
  }
}
