import {
  $createRangeSelection,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $setSelection,
  ElementNode,
  IS_HIGHLIGHT,
  TextNode,
} from "lexical";

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
  private parent: ElementNode | null = null;
  private content: WeakMap<ElementNode, string> = new WeakMap();
  constructor() {}

  searchIndex(searchQuery: string, parent: ElementNode) {
    if (!parent || !$isElementNode(parent)) return;
    const body = parent.getTextContent();

    const textNodes = parent.getAllTextNodes();
    const textNodeIndex: Array<TextNode> = [];
    const offsetIndex: Array<number> = [];
    if (this.content.get(parent) === body) return;
    this.content.set(parent, body);

    for (const textNode of textNodes) {
      const nodeText = textNode.getTextContent();

      for (let offset = 0; offset < nodeText.length; offset++) {
        offsetIndex.push(offset);
        textNodeIndex.push(textNode);
      }
    }

    //get all indices of the search query
    const bodyMatchIndexRanges: [number, number][] = [];
    let index = body.indexOf(searchQuery);

    while (index !== -1) {
      const start = index;
      const end = index + searchQuery.length - 1;
      bodyMatchIndexRanges.push([start, end]);
      index = body.indexOf(searchQuery, end + 1);
    }

    const map = new Map<TextNode, number[]>();
    for (const [startsInBody, endsInBody] of bodyMatchIndexRanges) {
      // //get all the nodes for the match
      for (let i = startsInBody; i <= endsInBody; i++) {
        if (!textNodeIndex[i]) {
          continue;
        }
        const prev = map.get(textNodeIndex[i]) ?? [];
        map.set(textNodeIndex[i], prev.concat(i));
      }
    }
    for (const [node, offsets] of map.entries()) {
      if (node.getTextContentSize() === 0) continue;
      if (offsets.length === node.getTextContentSize()) {
        if (!node.hasFormat("highlight")) {
          node.toggleFormat("highlight");
        }
        continue;
      }
      HighlightTransform.spliceHighlightNodes(node.getLatest(), offsets);
    }
  }

  static spliceHighlightNodes(node: TextNode, offsetRange: number[]): TextNode[] {
    const format = node.getFormat();
    const parent = node.getParent();
    if (!$isElementNode(parent) || !node?.getParent()) {
      return [];
    }
    const contentMap = node.getTextContent().split("");
    let splice = new Array(contentMap.length).fill(0);
    const HighlightNode = (text: string) => {
      const t = new TextNode(text);
      t.setFormat(format | IS_HIGHLIGHT);
      t.toggleUnmergeable();
      return t;
    };
    const RegularNode = (text: string) => {
      const t = new TextNode(text);
      t.setFormat(format);
      t.toggleUnmergeable();
      return t;
    };
    const offsetsSet = new Set(offsetRange);
    const nonHighlights = groupRange(contentMap.reduce((p, _n, i) => (!offsetsSet.has(i) ? p.concat(i) : p), []));
    for (const group of nonHighlights) {
      const text = group.map((i) => contentMap[i]).join("");
      if (text.length > 0) {
        const node = RegularNode(text);
        splice.splice(group[0], group.length, node);
      }
    }
    for (const group of groupRange(offsetRange)) {
      const text = group.map((i) => contentMap[i]).join("");
      if (text.length > 0) {
        const node = HighlightNode(text);
        splice.splice(group[0], group.length, node);
      }
    }
    splice = splice.filter(Boolean);

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
    const targetIndex = node.getIndexWithinParent();
    parent.splice(targetIndex, 1, splice); // Remove the original node

    // // --- 3. Restore selection if it was in the spliced node ---
    if (selectionIsInNode && selectionOffsetInNode !== null) {
      // Figure out which new node and offset the selection should be in
      let runningLength = 0;
      for (let i = 0; i < splice.length; i++) {
        const n = splice[i];
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
    return splice;
  }
}
