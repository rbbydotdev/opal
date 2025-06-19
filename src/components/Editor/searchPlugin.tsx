import { activeEditor$, Cell, realmPlugin, useCellValue, useRealm } from "@mdxeditor/editor";
import { RootNode } from "lexical";

export const MDX_SEARCH_NAME = "MdxSearch";

function* searchText(allText: string, searchQuery: string): Generator<[start: number, end: number]> {
  if (searchQuery === null) return [];
  let startPos = 0;
  while (startPos < allText.length) {
    const index = allText.toLowerCase().indexOf(searchQuery, startPos);
    if (index === -1) break;
    yield [index, index + searchQuery.length - 1];
    startPos = index + searchQuery.length;
  }
}
function* indexTextNodes(containerList: NodeListOf<Element>): Generator<{
  allText: string;
  nodeMap: Array<[node: Node, offset: number]>;
}> {
  const nodes = new Set<Node>();

  for (const container of containerList ?? []) {
    const treeWalker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let currentNode = treeWalker.nextNode();
    while (currentNode) {
      if (currentNode.textContent) {
        nodes.add(currentNode);
      }
      currentNode = treeWalker.nextNode();
    }
  }
  for (const node of nodes) {
    yield {
      allText: node.textContent ?? "",
      nodeMap: node
        ? new Array((node.textContent ?? "").length).fill(0).map((_, i) => [node, i] as [Node, number])
        : [],
    };
  }
}
export function* rangeSearchScan(parent: HTMLElement, searchQuery: string) {
  for (const { allText, nodeMap } of indexTextNodes(parent.querySelectorAll("ul,p,h1,h2,h3,h4"))) {
    for (const [start, end] of searchText(allText, searchQuery)) {
      const [startNode, startOffset] = nodeMap[start];
      const [endNode, endOffset] = nodeMap[end];
      const range = new Range();

      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset + 1);
      yield range;
    }
  }
}
const highlightRanges = (ranges: Range[] | Iterable<Range>) => {
  const highlight = new Highlight(...ranges);
  CSS.highlights.set(MDX_SEARCH_NAME, highlight);
};

export const editorSearchTerm$ = Cell<string>("");
export const editorSearchRanges$ = Cell<Range[]>([]);
export const editorSearchCursor$ = Cell<number>(0);

export function useEditorSearch() {
  const realm = useRealm();
  const ranges = useCellValue(editorSearchRanges$);
  const cursor = useCellValue(editorSearchCursor$);
  const search = useCellValue(editorSearchTerm$);
  function setSearch(term: string | null) {
    realm.pub(editorSearchTerm$, term ?? "");
  }

  const rangeCount = ranges.length;
  const normalizedCursor = rangeCount > 0 ? Math.max(1, cursor) : 0;
  function next() {
    realm.pub(editorSearchCursor$, (cursor + 1) % (ranges.length + 1));
  }

  function prev() {
    realm.pub(editorSearchCursor$, cursor <= 1 ? ranges.length : cursor - 1);
  }
  return { next, prev, total: rangeCount, cursor: normalizedCursor, setSearch, search, ranges };
}
export const searchPlugin = realmPlugin({
  postInit(realm) {
    const editor = realm.getValue(activeEditor$);

    if (editor && typeof CSS.highlights !== "undefined") {
      realm.sub(editorSearchTerm$, (searchQuery) => {
        if (editor) {
          const rootNode = editor.getRootElement();
          editor.update(() => {
            if (rootNode) {
              CSS.highlights.delete(MDX_SEARCH_NAME);
              const ranges = Array.from(rangeSearchScan(rootNode!, searchQuery));
              realm.pub(editorSearchRanges$, ranges);
              highlightRanges(ranges);
            }
          });
        }
      });
      editor.registerNodeTransform(RootNode, () => {
        queueMicrotask(() => {
          editor.update(() => {
            const searchQuery = realm.getValue(editorSearchTerm$);
            const rootNode = editor.getRootElement();
            if (searchQuery) {
              const ranges = Array.from(rangeSearchScan(rootNode!, searchQuery));
              realm.pub(editorSearchRanges$, ranges);
              highlightRanges(ranges);
            }
          });
        });
      });
    } else {
      console.log("No active editor found when initializing search plugin");
    }
  },
});
