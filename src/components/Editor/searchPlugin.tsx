import { Cell, debounceTime, map, realmPlugin, rootEditor$, useCellValue, useRealm } from "@mdxeditor/editor";
import { $createRangeSelection, $getNearestNodeFromDOMNode, $isTextNode, getNearestEditorFromDOMNode } from "lexical";
import { useCallback } from "react";

export const MDX_SEARCH_NAME = "MdxSearch";
export const MDX_FOCUS_SEARCH_NAME = "MdxFocusSearch";

type TextNodeIndex = {
  allText: string;
  nodeIndex: Node[];
  offsetIndex: number[];
};

export const editorSearchTerm$ = Cell<string>("");
export const editorSearchRanges$ = Cell<Range[]>([]);
export const editorSearchCursor$ = Cell<number>(0);
export const editorSearchTextNodeIndex$ = Cell<TextNodeIndex[]>([]);
export const editorSearchMode$ = Cell<"typing" | "replace">("typing");

function* searchText(allText: string, searchQuery: string): Generator<[start: number, end: number]> {
  if (searchQuery === null) return [];
  let startPos = 0;
  while (startPos < allText.length) {
    const index = allText.toLowerCase().indexOf(searchQuery.toLowerCase(), startPos);
    if (index === -1) break;
    yield [index, index + searchQuery.length - 1];
    startPos = index + searchQuery.length;
  }
}
function* indexTextNodes(containerList?: NodeListOf<HTMLElement>): Iterable<TextNodeIndex> {
  if (!containerList || containerList.length === 0) {
    return [];
  }
  for (const container of containerList ?? []) {
    let allText = "";
    const treeWalker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let currentNode = treeWalker.nextNode();
    const offsetIndex: number[] = [];
    const nodeIndex: Node[] = [];
    while (currentNode) {
      const nodeContent = currentNode.textContent ?? "";
      for (let i = 0; i < nodeContent.length; i++) {
        nodeIndex.push(currentNode);
        offsetIndex.push(i);
        allText += nodeContent[i];
      }
      currentNode = treeWalker.nextNode();
    }
    yield { offsetIndex, nodeIndex, allText };
  }
}
export function* rangeSearchScan(searchQuery: string, textNodeIndex: Iterable<TextNodeIndex>) {
  for (const { allText, offsetIndex, nodeIndex } of textNodeIndex) {
    for (const [start, end] of searchText(allText, searchQuery)) {
      const startOffset = offsetIndex[start];
      const endOffset = offsetIndex[end];
      const startNode = nodeIndex[start];
      const endNode = nodeIndex[end];
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

function isSimilarRange(
  range1: Pick<Range, "startContainer" | "startOffset">,
  range2: Pick<Range, "startContainer" | "startOffset">
) {
  if (!range1 || !range2) return false;
  return range1.startContainer === range2.startContainer && range1.startOffset === range2.startOffset;
}

function replaceTextInRange(range: Range, str: string, onUpdate?: () => void) {
  const startDomNode = range.startContainer;
  const endDomNode = range.endContainer;
  const startOffset = range.startOffset;
  const endOffset = range.endOffset;

  const editor = getNearestEditorFromDOMNode(startDomNode);
  if (!editor) {
    console.warn("No editor found for the provided DOM node.");
    return;
  }
  editor.update(
    () => {
      // 1. Find the Lexical nodes corresponding to the DOM nodes in your range.
      const startLexicalNode = $getNearestNodeFromDOMNode(startDomNode);
      const endLexicalNode = $getNearestNodeFromDOMNode(endDomNode);

      // 2. Safety check: Ensure they are valid TextNodes.
      if (!$isTextNode(startLexicalNode) || !$isTextNode(endLexicalNode)) {
        return;
      }

      // 3. Create a Lexical RangeSelection that mirrors your DOM Range.
      try {
        const selection = $createRangeSelection();
        selection.anchor.set(startLexicalNode.getKey(), startOffset, "text");
        selection.focus.set(endLexicalNode.getKey(), endOffset, "text");

        // 4. Perform the replacement. This deletes the selected content
        // and inserts the new string.
        selection.insertText(str);
      } catch (e) {
        console.warn("Error replacing text in the editor:", e);
        if (onUpdate) {
          onUpdate();
        }
        // Optionally, you can throw an error or handle it gracefully.
        // throw new Error("Failed to replace text in the editor");
      }
    },
    {
      onUpdate,
    }
  );
}

export function useEditorSearch() {
  const realm = useRealm();
  const ranges = useCellValue(editorSearchRanges$);
  const cursor = useCellValue(editorSearchCursor$);
  const search = useCellValue(editorSearchTerm$);

  const rangeCount = ranges.length;

  const scrollToRangeOrIndex = useCallback(
    (range: Range | number, options?: { ignoreIfInView?: boolean; behavior?: ScrollBehavior }) => {
      return scrollToRange(typeof range === "number" ? ranges[range - 1] : range, options);
    },
    [ranges]
  );

  const setSearch = useCallback(
    (term: string | null) => {
      realm.pub(editorSearchTerm$, term ?? "");
    },
    [realm]
  );

  const setMode = useCallback(
    (mode: "replace" | "typing") => {
      realm.pub(editorSearchMode$, mode);
    },
    [realm]
  );

  const next = useCallback(() => {
    if (!ranges.length) return;
    const newVal = (cursor % ranges.length) + 1;
    scrollToRangeOrIndex(newVal);
    realm.pub(editorSearchCursor$, newVal);
  }, [ranges, cursor, scrollToRangeOrIndex, realm]);

  const prev = useCallback(() => {
    if (!ranges.length) return;
    const newVal = cursor <= 1 ? ranges.length : cursor - 1;
    scrollToRangeOrIndex(newVal);
    realm.pub(editorSearchCursor$, newVal);
  }, [ranges, cursor, scrollToRangeOrIndex, realm]);

  const replace = useCallback(
    (str: string, onUpdate?: () => void) => {
      const currentRange = ranges[cursor - 1];
      const { startContainer, startOffset } = currentRange ?? {};

      return replaceTextInRange(currentRange, str, () => {
        //when the replaced text continues to match the search term
        //cursor must be incremented to the next match
        const unsub = realm.sub(editorSearchRanges$, (newRanges) => {
          unsub();
          if (isSimilarRange(newRanges[cursor - 1], { startOffset, startContainer })) {
            realm.pub(editorSearchCursor$, (cursor + 1) % (newRanges.length + 1) || 1);
          }
        });
        onUpdate?.();
      });
    },
    [ranges, cursor, realm]
  );

  const replaceAll = useCallback(
    (str: string, onUpdate?: () => void) => {
      let ticks = 0;
      for (let i = ranges.length - 1; i >= 0; i--) {
        replaceTextInRange(ranges[i], str, () => {
          ticks++;
          if (ticks >= ranges.length) {
            onUpdate?.();
          }
        });
      }
    },
    [ranges]
  );

  return {
    next,
    prev,
    total: rangeCount,
    cursor,
    setMode,
    setSearch,
    search,
    ranges,
    scrollToRangeOrIndex,
    replace,
    replaceAll,
  };
}

const getTextNodeIndex = (root: HTMLElement) =>
  indexTextNodes(root?.querySelectorAll("ul,p,h1,h2,h3,h4,h5,h6,code,pre") ?? []);
export const searchPlugin = realmPlugin({
  postInit(realm) {
    const editor = realm.getValue(rootEditor$);
    if (editor && typeof CSS.highlights !== "undefined") {
      realm.sub(editorSearchCursor$, (cursor) => {
        const ranges = realm.getValue(editorSearchRanges$);
        focusHighlightRange(ranges[cursor - 1]);
      });
      function updateHighlights(searchQuery: string, textNodeIndex: Iterable<TextNodeIndex>) {
        if (!searchQuery) {
          realm.pub(editorSearchCursor$, 0);
          realm.pub(editorSearchRanges$, []);
          return resetHighlights();
        }
        const ranges = Array.from(rangeSearchScan(searchQuery, textNodeIndex));
        realm.pub(editorSearchRanges$, ranges);
        // replace will be triggered here via a once sub
        // SEE: const unsub = realm.sub(editorSearchRanges$, (newRanges) => { ....
        // to determine if the replaced text continues to match the search term
        // if it does it will increment the cursor
        highlightRanges(ranges);
        if (ranges.length) {
          const currentCursor = realm.getValue(editorSearchCursor$) || 1;
          focusHighlightRange(ranges[currentCursor - 1]);
          realm.pub(editorSearchCursor$, currentCursor);
          scrollToRange(ranges[currentCursor - 1], { ignoreIfInView: true });
        } else {
          resetHighlights();
        }
      }
      realm.sub(editorSearchTextNodeIndex$, (textNodeIndex) => {
        updateHighlights(realm.getValue(editorSearchTerm$), textNodeIndex);
      });

      realm.sub(editorSearchTerm$, (searchQuery) => {
        updateHighlights(searchQuery, realm.getValue(editorSearchTextNodeIndex$));
      });

      const debouncedIndexer$ = realm.pipe(
        realm.pipe(
          editorSearchTextNodeIndex$,
          realm.transformer(
            debounceTime(250),
            map((index) => {
              return Array.from(index as Iterable<TextNodeIndex>);
            })
          )
        )
      );
      let observer: MutationObserver | null = null;
      //post init should take a clean up function but it does not
      return editor.registerRootListener((rootElement) => {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        if (rootElement) {
          realm.pub(editorSearchTextNodeIndex$, [...getTextNodeIndex(rootElement)]);
          observer = new MutationObserver(() => {
            if (realm.getValue(editorSearchMode$) === "replace") {
              realm.pub(editorSearchTextNodeIndex$, [...getTextNodeIndex(rootElement)]);
            } else {
              realm.pub(debouncedIndexer$, getTextNodeIndex(rootElement));
            }
          });
          observer.observe(rootElement, {
            childList: true,
            subtree: true,
            characterData: true,
          });
          return () => observer?.disconnect();
        }
      });
    } else {
      console.debug("No active editor found when initializing search plugin");
    }
  },
});
