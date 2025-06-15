/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Workspace } from "@/Db/Workspace";
import { ErrorPopupControl } from "@/components/ui/error-popup";
import { useWorkspaceRoute } from "@/context/WorkspaceHooks";
import { BadRequestError, isError } from "@/lib/errors";
import { absPath, dirname } from "@/lib/paths2";
import {
  AdmonitionDirectiveDescriptor,
  KitchenSinkToolbar,
  SandpackConfig,
  activeEditor$,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  directivesPlugin,
  frontmatterPlugin,
  headingsPlugin,
  imagePlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  realmPlugin,
  sandpackPlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from "@mdxeditor/editor";
import {
  $createRangeSelection,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $setSelection,
  ElementNode,
  LexicalNode,
  TextNode,
} from "lexical";
import { useEffect, useState } from "react";
const dataCode = `export const data = Array.from({ length: 10000 }, (_, i) => ({ id: i, name: 'Item ' + i }))`;

const defaultSnippetContent = `
export default function App() {
  return (
    <div className="App">
      <h1>Hello CodeSandbox</h1>
      <h2>Start editing to see some magic happen!</h2>
    </div>
  );
}
`.trim();

export const virtuosoSampleSandpackConfig: SandpackConfig = {
  defaultPreset: "react",
  presets: [
    {
      label: "React",
      name: "react",
      meta: "live react",
      sandpackTemplate: "react",
      sandpackTheme: "light",
      snippetFileName: "/App.js",
      snippetLanguage: "jsx",
      initialSnippetContent: defaultSnippetContent,
    },
    {
      label: "React",
      name: "react",
      meta: "live",
      sandpackTemplate: "react",
      sandpackTheme: "light",
      snippetFileName: "/App.js",
      snippetLanguage: "jsx",
      initialSnippetContent: defaultSnippetContent,
    },
    {
      label: "Virtuoso",
      name: "virtuoso",
      meta: "live virtuoso",
      sandpackTemplate: "react-ts",
      sandpackTheme: "light",
      snippetFileName: "/App.tsx",
      initialSnippetContent: defaultSnippetContent,
      dependencies: {
        "react-virtuoso": "latest",
        "@ngneat/falso": "latest",
      },
      files: {
        "/data.ts": dataCode,
      },
    },
  ],
};
export async function expressImageUploadHandler(image: File) {
  const formData = new FormData();
  formData.append("image", image);
  const response = await fetch("/uploads/new", { method: "POST", body: formData });
  const json = (await response.json()) as { url: string };
  return json.url;
}

//splices out text range of choice into seperate node: <TextNode?><TextNode_Match><TextNode?>

class HighlightTransform {
  constructor(public searchQuery: string, private contentMap: WeakMap<ElementNode, string> = new WeakMap()) {}
  transform = (transformNode: TextNode) => {
    // Traverse up until we find a ParagraphNode, HeadingNode, QuoteNode, or ListNode
    const parent = transformNode.getParent()?.getLatest();
    if (!parent || !$isElementNode(parent)) return;
    const body = parent.getTextContent();
    this.contentMap.set(parent, body);
    console.log(transformNode.getKey(), transformNode.getTextContent(), Date.now());

    const textNodes = parent.getAllTextNodes();

    const textNodeIndex: ReadonlyArray<TextNode> = [];
    const offsetIndex: ReadonlyArray<number> = [];
    // const offsetNodeMap: ReadonlyWeakMap<TextNode, number[]> = new WeakMap<TextNode, number[]>();

    for (const textNode of textNodes) {
      const nodeText = textNode.getTextContent();

      // (offsetNodeMap as WeakMap<TextNode, number[]>).set(textNode, [...(offsetNodeMap.get(textNode) ?? []), offset]);
      for (let offset = 0; offset < nodeText.length; offset++) {
        (offsetIndex as Array<unknown>).push(offset);
        (textNodeIndex as Array<unknown>).push(textNode);
        // (offsetNodeMap as WeakMap<TextNode, number[]>).set(textNode, [...(offsetNodeMap.get(textNode) ?? []), offset]);
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

    const groupedOffsets: number[][] = [];
    let matchedTextNodes: TextNode[] = [];

    //each match
    for (const [startsInBody, endsInBody] of bodyMatchIndexRanges) {
      //get all the nodes for the match
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
    textNodes
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
    if (matchStartsIndex > 0) {
      const startTextNode = new TextNode(str.slice(0, matchStartsIndex));
      startTextNode.setFormat(node.getFormat());
      spliced.push(startTextNode);
      nodes.s = startTextNode;
    }
    // match
    if (matchStartsIndex <= matchEndsIndex) {
      const middleTextNode = new TextNode(str.slice(matchStartsIndex, matchEndsIndex + 1));
      spliced.push(middleTextNode);
      nodes.m = middleTextNode;
    }
    // end
    if (matchEndsIndex < str.length) {
      const endTextNode = new TextNode(str.slice(matchEndsIndex + 1));
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

export const searchPlugin = realmPlugin({
  postInit(realm) {
    //add cmd+f shortcut to open search
    const editor = realm.getValue(activeEditor$);

    const MyTransform = new HighlightTransform("foobar");
    window.addEventListener("keydown", (e) => {
      if (e.key === "f" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const editor = realm.getValue(activeEditor$);
        if (editor) {
          MyTransform.searchQuery = prompt("Enter search query:", MyTransform.searchQuery) ?? MyTransform.searchQuery;
          editor.update(() => {
            // No-op: just read the root node
            $getRoot()
              .getAllTextNodes()
              .forEach((textNode) => {
                MyTransform.transform(textNode);
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
        editor.registerNodeTransform(TextNode, MyTransform.transform);
      });
    } else {
      console.log("No active editor found when initializing search plugin");
    }
  },
});

export function useAllPlugins({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const [imgs, setImgs] = useState<string[]>([]);

  const { path } = useWorkspaceRoute();
  useEffect(() => {
    return currentWorkspace.watchDisk(() => {
      setImgs(currentWorkspace.getImages().map((i) => i));
    });
  }, [currentWorkspace]);

  return [
    toolbarPlugin({ toolbarContents: () => <KitchenSinkToolbar /> }),
    listsPlugin(),
    quotePlugin(),
    headingsPlugin({ allowedHeadingLevels: [1, 2, 3, 4] }),
    linkPlugin(),
    searchPlugin(),
    linkDialogPlugin(),
    imagePlugin({
      imageAutocompleteSuggestions: imgs,
      imagePreviewHandler: async (src: string) => {
        return Promise.resolve(src);
      },
      imageUploadHandler: async (file: File) => {
        try {
          return await currentWorkspace
            .dropImageFile(file, path ? absPath(dirname(path)) : absPath("/"))
            .then((path) => String(path));
        } catch (e) {
          console.error("image upload handler error");
          console.error(e);
          if (isError(e, BadRequestError)) {
            ErrorPopupControl.show({
              title: "Not a valid image",
              description: "Please upload a valid image file (png,gif,webp,jpg)",
            });
            return Promise.resolve(file.name ?? "");
          } else {
            throw e;
          }
        }
      },
    }),
    tablePlugin(),
    thematicBreakPlugin(),
    frontmatterPlugin(),
    codeBlockPlugin({ defaultCodeBlockLanguage: "" }),
    sandpackPlugin({ sandpackConfig: virtuosoSampleSandpackConfig }),
    codeMirrorPlugin({
      codeBlockLanguages: { js: "JavaScript", css: "CSS", txt: "Plain Text", tsx: "TypeScript", "": "Unspecified" },
    }),
    directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
    diffSourcePlugin({ viewMode: "rich-text", diffMarkdown: "<ORIGINAL_MARKDOWN_HERE>" }),
    markdownShortcutPlugin(),
  ];
}

// while (
//   parent &&
//   !$isElementNode(parent) &&
//   !(
//     parent instanceof ParagraphNode ||
//     parent instanceof HeadingNode ||
//     parent instanceof QuoteNode ||
//     parent instanceof ListNode ||
//     parent instanceof RootNode
//   )
// ) {
//   parent = parent.getParent();
// }
