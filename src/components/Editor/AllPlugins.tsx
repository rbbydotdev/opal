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
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $setSelection,
  LexicalNode,
  ParagraphNode,
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

function spliceNode(node: TextNode, offsets: number[]) {
  // offsets[0] is the theoretical start and offsets[1] is the end
  const parent = node.getParent()!;
  const str = node.getTextContent();
  const s = offsets.shift()!;
  const e = (offsets.pop() ?? s) + 1;

  const spliced: TextNode[] = [];

  // --- 1. Capture selection info before splicing ---
  const selection = $getSelection();
  let selectionOffsetInNode: number | null = null;
  let selectionIsInNode = false;
  if ($isRangeSelection(selection) && selection && selection.isCollapsed() && selection.anchor.key === node.getKey()) {
    selectionIsInNode = true;
    selectionOffsetInNode = selection.anchor.offset;
  }

  // --- 2. Splice the node as before ---
  // start
  if (s > 0) {
    const startTextNode = new TextNode(str.slice(0, s));
    startTextNode.setFormat(node.getFormat());
    if (startTextNode.hasFormat("highlight")) startTextNode.toggleFormat("highlight");
    spliced.push(startTextNode);
  }
  // middle
  if (s < e) {
    const middleTextNode = new TextNode(str.slice(s, e));
    middleTextNode.setFormat(node.getFormat());
    middleTextNode.toggleFormat("highlight");
    spliced.push(middleTextNode);
  }
  // end
  if (e < str.length) {
    const endTextNode = new TextNode(str.slice(e));
    endTextNode.setFormat(node.getFormat());
    if (endTextNode.hasFormat("highlight")) endTextNode.toggleFormat("highlight");
    spliced.push(endTextNode);
  }

  if (!$isElementNode(parent)) {
    console.error("Parent is not an ElementNode", parent);
    return;
  } else {
    const targetIndex = node.getIndexWithinParent();
    // console.log(spliced.map((n) => n.getTextContent()).join("|"));

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
}

function highlightParagraphTransform(paragraphNode: ParagraphNode): boolean {
  //get text nodes
  // Recursively get all TextNode descendants at any depth
  function getAllTextNodes(node: LexicalNode): TextNode[] {
    if (node instanceof TextNode) return [node];
    if ($isElementNode(node)) {
      return node.getChildren().flatMap(getAllTextNodes);
    }
    return [];
  }
  //check if highlight format is already applied
  const textNodes = getAllTextNodes(paragraphNode);
  let i = 0;
  const map: TextNode[] = [];
  const offsets: number[] = [];
  let wholeText = "";
  for (const node of textNodes) {
    const chars = node.getTextContent().split("");
    let offset = 0;
    for (const char of chars) {
      wholeText += char;
      map[i] = node;
      offsets[i] = offset;
      i++;
      offset++;
    }
  }

  const searchText = "needle";
  const start = wholeText.indexOf(searchText);
  if (start === -1) {
    //remove highlight from all nodes
    textNodes.forEach((node) => {
      if (node.hasFormat("highlight")) {
        node.toggleFormat("highlight");
      }
    });
    return false;
  } else if (map[start].hasFormat("highlight")) {
    return false;
  }
  const end = start + searchText.length;
  let currNode = map[start];
  if (!currNode) {
    console.warn("No current node found for the start index", start);
    return false;
  }
  for (let i = start; i < end; i++) {
    const segmentIndices: number[] = [];
    do {
      segmentIndices.push(offsets[i]);
    } while (map[++i] === currNode && i < end);

    console.log(currNode, currNode.getTextContent(), segmentIndices);
    spliceNode(currNode, segmentIndices);
    currNode = map[i];
    i--;
  }
  return true;
}

export const searchPlugin = realmPlugin({
  postInit(realm) {
    // realm.pub(addImportVisitor$, MdastTextVisitor);
    const editor = realm.getValue(activeEditor$);
    if (editor) {
      editor.update(() => {
        // Register the highlight transform for TextNode.

        // const contentMap = WeakMap<ParagraphNode, Map<string, [number, number][]>>();
        const contentMap: WeakMap<TextNode, string> = new WeakMap();
        editor.registerNodeTransform(TextNode, (textNode) => {
          // console.log(textNode.getTextContent());
          // Find the closest parent ParagraphNode
          let parent = textNode.getParent();
          while (parent && !$isParagraphNode(parent)) {
            parent = parent.getParent();
          }
          if (!parent || !$isParagraphNode(parent)) return;
          const content = parent.getTextContent();
          if (contentMap.get(textNode) === content) return; // No change in content, skip processing
          contentMap.set(textNode, content);
          const textNodes = parent.getAllTextNodes();

          let body = "";
          const map = new Map();
          for (const textNode of textNodes) {
            const content = textNode.getTextContent();
            content.split("").forEach((_, i) => map.set(body.length + i, textNode));
            body += content;
          }
          //get all indices of the search query
          const searchQuery = "needle";
          const indices: [number, number][] = [];
          let index = body.indexOf(searchQuery);
          while (index !== -1) {
            indices.push([index, index + searchQuery.length]);
            index = body.indexOf(searchQuery, index + 1);
          }
          console.log(indices);
        });

        // editor.registerNodeTransform(ParagraphNode, (paragraphNode) => {
        //   highlightParagraphTransform(paragraphNode);
        // });
        // editor.registerNodeTransform(TextNode, (textNode) => {});
        // editor.registerNodeTransform(TextNode, (textNode) => {
        //   if (textNode.isDirty()) return;
        //   // editor.registerNodeTransform(TextNode, (textNode) => {
        //   //   // If the text node has the highlight format, we can handle it here.
        //   if (textNode.getTextContent().includes("needle")) {
        //     console.log("Highlighting text node:", textNode.getTextContent());
        //     // highlightParagraphTransform
        //     //get parents until we find a ParagraphNode
        //     let parent = textNode.getParent();
        //     while (parent && !(parent instanceof ParagraphNode)) {
        //       parent = parent.getParent();
        //     }
        //     highlightParagraphTransform(parent as ParagraphNode);
        //   }
        // });
        // });
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

// function highlightParagraphTransform__OLD(paragraphNode: ParagraphNode) {
//   //get text nodes
//   const textNodes = paragraphNode.getChildren().filter((child) => child instanceof TextNode);
//   const fullText = paragraphNode.getTextContent();
//   if (fullText === "") {
//     return;
//   }

//   const query = new RegExp(SEARCH_QUERY, "gi");
//   const matches = [...fullText.matchAll(query)];

//   // If there are no matches, ensure no nodes are highlighted.
//   if (matches.length === 0) {
//     paragraphNode.getChildren().forEach((child) => {
//       if (child instanceof TextNode && child.hasFormat("highlight")) {
//         child.toggleFormat("highlight");
//       }
//     });
//     return;
//   }

//   // --- Reconcile nodes with matches ---
//   let offset = 0;
//   paragraphNode.getChildren().forEach((child) => {
//     if (!(child instanceof TextNode)) {
//       return;
//     }

//     const nodeText = child.getTextContent();
//     const nodeLength = nodeText.length;
//     const nodeStart = offset;
//     const nodeEnd = offset + nodeLength;

//     // Determine if this node should be highlighted.
//     let shouldBeHighlighted = false;
//     for (const match of matches) {
//       const matchStart = match.index;
//       const matchEnd = matchStart + match[0].length;
//       // Check for any overlap between the node's range and the match's range.
//       if (Math.max(nodeStart, matchStart) < Math.min(nodeEnd, matchEnd)) {
//         shouldBeHighlighted = true;
//         break;
//       }
//     }

//     // Apply or remove format only if the state is incorrect.
//     // This is the crucial precondition to prevent infinite loops.
//     if (shouldBeHighlighted && !child.hasFormat("highlight")) {
//       child.toggleFormat("highlight");
//     } else if (!shouldBeHighlighted && child.hasFormat("highlight")) {
//       child.toggleFormat("highlight");
//     }

//     offset += nodeLength;
//   });
// }
