import { backgroundRefresh } from "@/lib/backgroundRefresh";
import { activeEditor$, Cell, realmPlugin, useCellValue, useRealm } from "@mdxeditor/editor";
import { RootNode } from "lexical";
import { useCallback } from "react";

export const MDX_SEARCH_NAME = "MdxSearch";
export const MDX_FOCUS_SEARCH_NAME = "MdxFocusSearch";

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
type TextNodeIndex = {
  allText: string;
  nodeMap: Array<[node: Node, offset: number]>;
};
function* indexTextNodes(containerList?: NodeListOf<Element>): Iterable<TextNodeIndex> {
  if (!containerList || containerList.length === 0) {
    return [];
  }
  console.log("indexing for search");
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
export function* rangeSearchScan(parent: HTMLElement, searchQuery: string, textNodeIndex?: Iterable<TextNodeIndex>) {
  for (const { allText, nodeMap } of textNodeIndex ?? indexTextNodes(parent.querySelectorAll("ul,p,h1,h2,h3,h4"))) {
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
const focusHighlightRange = (range?: Range | null) => {
  CSS.highlights.delete(MDX_FOCUS_SEARCH_NAME);
  if (range) CSS.highlights.set(MDX_FOCUS_SEARCH_NAME, new Highlight(range));
};

const highlightRanges = (ranges: Range[] | Iterable<Range>) => {
  CSS.highlights.set(MDX_SEARCH_NAME, new Highlight(...ranges));
};

const resetHighlights = () => {
  CSS.highlights.delete(MDX_SEARCH_NAME);
  CSS.highlights.delete(MDX_FOCUS_SEARCH_NAME);
};

export const editorSearchTerm$ = Cell<string>("");
export const editorSearchRanges$ = Cell<Range[]>([]);
export const editorSearchCursor$ = Cell<number>(0);

const scrollToRange = (range: Range, options?: { ignoreIfInView?: boolean; behavior?: ScrollBehavior }) => {
  const el = range.startContainer.parentElement as HTMLElement;
  const ignoreIfInView = options?.ignoreIfInView ?? false;
  const behavior = options?.behavior ?? "smooth";
  if (ignoreIfInView) {
    const rect = el.getBoundingClientRect();
    const inView =
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth);
    if (inView) return;
  }
  el.scrollIntoView({ behavior });
};

export function useEditorSearch() {
  const realm = useRealm();
  const ranges = useCellValue(editorSearchRanges$);
  const cursor = useCellValue(editorSearchCursor$);
  const search = useCellValue(editorSearchTerm$);
  function setSearch(term: string | null) {
    realm.pub(editorSearchTerm$, term ?? "");
  }

  const rangeCount = ranges.length;

  const scrollToRangeOrIndex = useCallback(
    (range: Range | number, options?: { ignoreIfInView?: boolean; behavior?: ScrollBehavior }) => {
      return scrollToRange(typeof range === "number" ? ranges[range - 1] : range, options);
    },
    [ranges]
  );

  function next() {
    if (!ranges.length) return;
    // range.startContainer.parentElement.scrollIntoView({ behavior: 'smooth' });
    const newVal = (cursor % ranges.length) + 1;
    scrollToRangeOrIndex(newVal);
    realm.pub(editorSearchCursor$, newVal);
  }
  function prev() {
    if (!ranges.length) return;
    const newVal = cursor <= 1 ? ranges.length : cursor - 1;
    scrollToRangeOrIndex(newVal);
    realm.pub(editorSearchCursor$, newVal);
  }

  return { next, prev, total: rangeCount, cursor, setSearch, search, ranges, scrollToRangeOrIndex };
}

export const searchPlugin = realmPlugin({
  postInit(realm) {
    const editor = realm.getValue(activeEditor$);
    if (editor && typeof CSS.highlights !== "undefined") {
      let textNodeIndex: Iterable<TextNodeIndex>;
      const getTextNodeIndex = (root: HTMLElement) => indexTextNodes(root?.querySelectorAll("ul,p,h1,h2,h3,h4"));
      const backgroundIndex = backgroundRefresh(
        (root: HTMLElement) => (textNodeIndex = [...getTextNodeIndex(root)]),
        1000
      );

      // focusHighlightRange
      realm.sub(editorSearchCursor$, (cursor) => {
        const ranges = realm.getValue(editorSearchRanges$);
        focusHighlightRange(ranges[cursor - 1]);
      });
      realm.sub(editorSearchTerm$, (searchQuery) => {
        if (editor) {
          const rootNode = editor.getRootElement();
          editor.update(() => {
            if (rootNode) {
              CSS.highlights.delete(MDX_SEARCH_NAME);
              if (!textNodeIndex) textNodeIndex = backgroundIndex(rootNode!);

              const ranges = Array.from(rangeSearchScan(rootNode!, searchQuery, textNodeIndex));
              realm.pub(editorSearchRanges$, ranges);
              highlightRanges(ranges);

              if (ranges.length) {
                focusHighlightRange(ranges[0]);
                realm.pub(editorSearchCursor$, 1);
                scrollToRange(ranges[0], { ignoreIfInView: true });
              } else {
                resetHighlights();
              }
            }
          });
        }
      });
      editor.registerNodeTransform(RootNode, () => {
        queueMicrotask(() => {
          editor.update(() => {
            const searchQuery = realm.getValue(editorSearchTerm$);
            const rootNode = editor.getRootElement();
            textNodeIndex = backgroundIndex(rootNode!);

            if (searchQuery) {
              const ranges = Array.from(rangeSearchScan(rootNode!, searchQuery, textNodeIndex));
              realm.pub(editorSearchRanges$, ranges);

              highlightRanges(ranges);
            } else {
              resetHighlights();
            }
          });
        });
      });
    } else {
      console.log("No active editor found when initializing search plugin");
    }
  },
});
