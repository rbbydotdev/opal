import { activeEditor$, realmPlugin } from "@mdxeditor/editor";
import { $getEditor, $getRoot, $isElementNode, RootNode } from "lexical";
const highlightSearch = (rootNode: RootNode, searchQuery: string) => {
  if (typeof Highlight !== "undefined") {
    const parent = rootNode;
    CSS.highlights.delete("editor-search");
    if (!parent || !$isElementNode(rootNode)) return;
    const containers = $getEditor().getElementByKey(parent.getLatest().getKey());
    const ranges: Range[] = [];
    for (const container of containers?.querySelectorAll("ul,p,h1,h2,h3,h4,span") ?? []) {
      const allTextNodes = [];
      let map: Array<[Node, number]> = [];
      let allText = "";
      const treeWalker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      let currentNode = treeWalker.nextNode();
      while (currentNode) {
        allTextNodes.push(currentNode);
        allText += currentNode.textContent ?? "";
        map = map.concat(
          currentNode
            ? new Array((currentNode.textContent ?? "").length)
                .fill(0)
                .map((_, i) => [currentNode, i] as [Node, number])
            : []
        );
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
        const [startNode, startOffset] = map[index];
        const [endNode, endOffset] = map[index + searchQuery.length - 1];
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset + 1);
        ranges.push(range);
      }
      const highlight = new Highlight(...ranges.flat());
      CSS.highlights.set("EditorSearch", highlight);
    }
  }
};

export const searchPlugin = realmPlugin({
  postInit(realm) {
    //add cmd+f shortcut to open search
    const editor = realm.getValue(activeEditor$);
    let searchQuery: string | null = "foobar";

    // const HighlightTransformer = new HighlightTransform("foobar");
    window.addEventListener("keydown", (e) => {
      if (e.key === "f" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const editor = realm.getValue(activeEditor$);
        if (editor) {
          // HighlightTransformer.searchQuery =
          searchQuery = prompt("Enter search query:", searchQuery ?? "") ?? null;
          editor.update(() => {
            // No-op: just read the root node
            if (searchQuery) highlightSearch($getRoot(), searchQuery);
          });
          editor.focus();
          // // Open search dialog or perform search
          // // This is a placeholder for your search logic
          console.log("Search triggered");
        }
      }
    });
    let debounceRef: ReturnType<typeof setTimeout> | null = null;
    if (editor) {
      editor.registerNodeTransform(RootNode, (rootNode) => {
        if (debounceRef) clearTimeout(debounceRef);
        debounceRef = setTimeout(() => {
          editor.update(() => {
            if (searchQuery) highlightSearch(rootNode.getLatest(), searchQuery);
          });
        }, 0);
      });
    } else {
      console.log("No active editor found when initializing search plugin");
    }
  },
});
