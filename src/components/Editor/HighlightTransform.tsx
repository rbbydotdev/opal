import {
  $createRangeSelection,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $setSelection,
  ElementNode,
  LexicalNode,
  TextNode,
} from "lexical";

//splices out text range of choice into seperate node: <TextNode?><TextNode_Match><TextNode?>
export class HighlightTransform {
  offsetMap = new WeakMap<ElementNode, number[]>();
  parentText = new WeakMap<ElementNode, string>();
  hnodeText = new WeakMap<TextNode, string>();
  constructor(public searchQuery: string, private contentMap: WeakMap<ElementNode, string> = new WeakMap()) {}

  paragraphNodeTransform = (transformNode: ElementNode) => {};
  textNodeTransform = (transformNode: TextNode) => {
    // Traverse up until we find a ParagraphNode, HeadingNode, QuoteNode, or ListNode
    const parent = transformNode.getParent()?.getLatest();
    if (!parent || !$isElementNode(parent)) return;
    const body = parent.getTextContent();

    const textNodes = parent.getAllTextNodes();

    const textNodeIndex: Array<TextNode> = [];
    const offsetIndex: Array<number> = [];

    for (const textNode of textNodes) {
      const nodeText = textNode.getTextContent();

      for (let offset = 0; offset < nodeText.length; offset++) {
        offsetIndex.push(offset);
        textNodeIndex.push(textNode);
      }
    }

    //get all indices of the search query
    const bodyMatchIndexRanges: [number, number][] = [];
    let index = body.indexOf(this.searchQuery);

    while (index !== -1) {
      const start = index;
      const end = index + this.searchQuery.length - 1;
      bodyMatchIndexRanges.push([start, end]);
      index = body.indexOf(this.searchQuery, end + 1);
    }

    //each match
    const groupedOffsets: number[][] = [];
    let matchedTextNodes: TextNode[] = [];

    //find indexes of body transformNode occupies
    //reduce bodyMatchIndexRanges to just the intersecting ranges
    // const transformNodeIndex = textNodeIndex.indexOf(transformNode);
    // if (transformNodeIndex === -1) {
    //   console.error("Transform node not found in textNodeIndex");
    //   return;
    // }
    // bodyMatchIndexRanges = bodyMatchIndexRanges.filter(([start, end]) => {
    // return start <= transformNodeIndex && end >= transformNodeIndex;
    // });
    // console.log(bodyMatchIndexRanges);

    for (const [startsInBody, endsInBody] of bodyMatchIndexRanges) {
      // //get all the nodes for the match
      matchedTextNodes = matchedTextNodes.concat(
        Array.from(new Set(textNodeIndex.slice(startsInBody, endsInBody + 1)))
      );
      //each match offset can be 0,1,2,3 or 1,2,0,1,2 or 3,0,1,2,3 etc ... these will then be grouped by ascending below
      const allOffsets = offsetIndex.slice(startsInBody, endsInBody + 1);
      //reminder, offset can span multiple nodes so need to group like [1/2-match][1/2-match]
      let currList: number[] = [];

      for (let i = 0; i < allOffsets.length; i++) {
        if ((allOffsets[i - 1] ?? Infinity) < allOffsets[i]) {
          currList.push(allOffsets[i]);
        } else {
          currList = [allOffsets[i]];
          groupedOffsets.push(currList);
        }
      }
    }

    //Remove highlight from non matching
    const matchedNodesSet = new WeakSet(matchedTextNodes);
    textNodeIndex
      .filter((node) => !matchedNodesSet.has(node) && node.hasFormat("highlight"))
      .forEach((textNode) => textNode.toggleFormat("highlight"));

    for (let i = 0; i < matchedTextNodes.length; i++) {
      const node = matchedTextNodes[i];
      const offsetMatch = groupedOffsets[i];
      //node is already cut up for our highlighting
      if (offsetMatch.length === node.getTextContentSize()) {
        if (!node.hasFormat("highlight")) {
          node.toggleFormat("highlight");
        }
      } else {
        const start = offsetMatch.shift()!;
        const end = offsetMatch.pop() ?? start;
        const matchNode = HighlightTransform.spliceNode(node.getLatest(), node.getParent()!, start, end).m;
        if (matchNode) {
          this.hnodeText.set(matchNode, matchNode.getTextContent());
          if (!matchNode.hasFormat("highlight")) {
            matchNode.toggleFormat("highlight");
          }
          //makes node unmergeable to prevent infinite loops
          if (!matchNode.isUnmergeable()) matchNode.toggleUnmergeable();
          matchNode.setFormat(node.getFormat());
        }
      }
    }
  };
  static spliceNode(
    node: TextNode,
    parent: LexicalNode,
    matchStartsIndex: number,
    matchEndsIndex: number
  ): typeof nodes {
    // offsets[0] is the theoretical start and offsets[1] is the end
    // const parent = node.getParent()!;
    const spliced: TextNode[] = [];
    const nodes = { s: null as TextNode | null, m: null as TextNode | null, e: null as TextNode | null };
    // return nodes;
    if (!$isElementNode(parent) || !node?.getParent()) {
      // console.log("Parent is not an ElementNode", "textnode key =", node.getKey());
      return nodes;
    }
    const str = node.getTextContent();

    // --- 1. Capture selection info before splicing ---
    const selection = $getSelection();
    let selectionOffsetInNode: number | null = null;
    let selectionIsInNode = false;
    if (
      $isRangeSelection(selection) &&
      selection &&
      selection.isCollapsed() &&
      selection.anchor.key === node.getKey()
    ) {
      selectionIsInNode = true;
      selectionOffsetInNode = selection.anchor.offset;
    }

    // --- 2. Splice the node as before ---
    // start
    const startText = str.slice(0, matchStartsIndex);
    const matchText = str.slice(matchStartsIndex, matchEndsIndex + 1);
    const endText = str.slice(matchEndsIndex + 1);
    if (matchStartsIndex > 0) {
      const startTextNode = new TextNode(startText);
      startTextNode.setFormat(node.getFormat());
      spliced.push(startTextNode);
      nodes.s = startTextNode;
    }
    // match
    if (matchStartsIndex <= matchEndsIndex) {
      const middleTextNode = new TextNode(matchText);
      spliced.push(middleTextNode);
      nodes.m = middleTextNode;
    }
    // end
    if (matchEndsIndex < str.length) {
      const endTextNode = new TextNode(endText);
      endTextNode.setFormat(node.getFormat());
      spliced.push(endTextNode);
      nodes.e = endTextNode;
    }

    if (!$isElementNode(parent)) {
      return nodes;
    } else {
      const targetIndex = node.getIndexWithinParent();
      parent.splice(targetIndex, 1, spliced); // Remove the original node
    }

    // --- 3. Restore selection if it was in the spliced node ---
    if (selectionIsInNode && selectionOffsetInNode !== null) {
      // Figure out which new node and offset the selection should be in
      let runningLength = 0;
      for (let i = 0; i < spliced.length; i++) {
        const n = spliced[i];
        const nodeLength = n.getTextContentSize();
        if (selectionOffsetInNode <= runningLength + nodeLength) {
          // The selection offset falls within this node
          const offsetInNewNode = selectionOffsetInNode - runningLength;
          // Set the selection to this node and offset
          const rangeSelection = $createRangeSelection();
          rangeSelection.anchor.set(n.getKey(), offsetInNewNode, "text");
          rangeSelection.focus.set(n.getKey(), offsetInNewNode, "text");
          $setSelection(rangeSelection);
          break;
        }
        runningLength += nodeLength;
      }
    }
    return nodes;
  }
}
