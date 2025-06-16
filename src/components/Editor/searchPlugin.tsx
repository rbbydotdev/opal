import { HighlightTransform } from "@/components/Editor/HighlightTransform";
import { activeEditor$, realmPlugin } from "@mdxeditor/editor";
import { $getRoot, $isElementNode, ElementNode, TextNode } from "lexical";

export function searchElementNode(parent: ElementNode, searchQuery: string) {
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
  let index = body.indexOf(searchQuery);

  while (index !== -1) {
    const start = index;
    const end = index + searchQuery.length - 1;
    bodyMatchIndexRanges.push([start, end]);
    index = body.indexOf(searchQuery, end + 1);
  }

  //each match
  const groupedOffsets: number[][] = [];
  let matchedTextNodes: TextNode[] = [];

  for (const [startsInBody, endsInBody] of bodyMatchIndexRanges) {
    // //get all the nodes for the match
    matchedTextNodes = matchedTextNodes.concat(Array.from(new Set(textNodeIndex.slice(startsInBody, endsInBody + 1))));
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
  return { matchedTextNodes, groupedOffsets };
}

export const searchPlugin = realmPlugin({
  postInit(realm) {
    //add cmd+f shortcut to open search
    const editor = realm.getValue(activeEditor$);

    const HighlightTransformer = new HighlightTransform("foobar");
    window.addEventListener("keydown", (e) => {
      if (e.key === "f" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const editor = realm.getValue(activeEditor$);
        if (editor) {
          HighlightTransformer.searchQuery =
            prompt("Enter search query:", HighlightTransformer.searchQuery) ?? HighlightTransformer.searchQuery;
          editor.update(() => {
            // No-op: just read the root node
            $getRoot()
              .getAllTextNodes()
              .forEach((textNode) => {
                HighlightTransformer.textNodeTransform(textNode);
              });
          });
          editor.focus();
          // Open search dialog or perform search
          // This is a placeholder for your search logic
          console.log("Search triggered");
        }
      }
    });

    // realm.pub(addImportVisitor$, MdastTextVisitor);
    if (editor) {
      editor.update(() => {
        // editor.registerNodeTransform(TextNode, HighlightTransformer.textNodeTransform);
        // editor.registerNodeTransform(ParagraphNode, HighlightTransformer.paragraphNodeTransform);
        editor.registerUpdateListener(({ dirtyElements, dirtyLeaves, editorState }) => {
          editorState.read(() => {
            if (dirtyLeaves.size) {
              const { matchedTextNodes, groupedOffsets } = searchElementNode($getRoot(), "foobar");
            }
          });
        });
      });
    } else {
      console.log("No active editor found when initializing search plugin");
    }
  },
});
