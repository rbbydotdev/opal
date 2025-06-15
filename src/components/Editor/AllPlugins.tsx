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
  $isRangeSelection,
  $setSelection,
  ElementNode,
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
function spliceNode(node: TextNode, matchStartsIndex: number, matchEndsIndex: number) {
  // offsets[0] is the theoretical start and offsets[1] is the end
  const parent = node.getParent()!;
  const str = node.getTextContent();

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
  const nodes = { s: null as TextNode | null, m: null as TextNode | null, e: null as TextNode | null };
  if (matchStartsIndex > 0) {
    const startTextNode = new TextNode(str.slice(0, matchStartsIndex));
    startTextNode.setFormat(node.getFormat());
    spliced.push(startTextNode);
    nodes.s = startTextNode;
  }
  // middle
  if (matchStartsIndex < matchEndsIndex) {
    const middleTextNode = new TextNode(str.slice(matchStartsIndex, matchEndsIndex));
    middleTextNode.setFormat(node.getFormat());
    spliced.push(middleTextNode);
    nodes.m = middleTextNode;
  }
  // end
  if (matchEndsIndex < str.length) {
    const endTextNode = new TextNode(str.slice(matchEndsIndex));
    endTextNode.setFormat(node.getFormat());
    spliced.push(endTextNode);
    nodes.e = endTextNode;
  }

  if (!$isElementNode(parent)) {
    console.error("Parent is not an ElementNode", parent);
    return nodes;
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
  return nodes;
}

// let overflow = 0;

export const searchPlugin = realmPlugin({
  postInit(realm) {
    // realm.pub(addImportVisitor$, MdastTextVisitor);
    const editor = realm.getValue(activeEditor$);
    if (editor) {
      editor.update(() => {
        // Register the highlight transform for TextNode.

        // const contentMap = WeakMap<ParagraphNode, Map<string, [number, number][]>>();
        const contentMap: WeakMap<ElementNode, string> = new WeakMap();
        editor.registerNodeTransform(TextNode, (textNode) => {
          // if (overflow > 500) {
          //   console.log(overflow, textNode);
          //   return;
          // }
          // overflow++;
          // console.log(textNode.getTextContent());
          // Find the closest parent ParagraphNode
          const parent = textNode.getParent();

          if (!parent || !$isElementNode(parent)) return;

          const body = parent.getTextContent();

          if (contentMap.get(parent) === body) return; // No change in content, skip processing
          contentMap.set(parent, body);

          const textNodes = parent.getAllTextNodes();

          //should i store the textnode id instead of the node?
          const textNodeIndex: ReadonlyArray<TextNode> = [];
          const offsetIndex: ReadonlyArray<number> = [];

          for (const textNode of textNodes) {
            if (textNode.hasFormat("highlight")) {
              textNode.toggleFormat("highlight");
              return;
            }
            const nodeText = textNode.getTextContent();
            for (let offset = 0; offset < nodeText.length; offset++) {
              (offsetIndex as Array<unknown>).push(offset);
              (textNodeIndex as Array<unknown>).push(textNode);
            }
          }

          //get all indices of the search query
          const searchQuery = "needle";
          const bodyMatchIndexRanges: [number, number][] = [];
          let index = body.indexOf(searchQuery);

          while (index !== -1) {
            const start = index;
            const end = index + searchQuery.length - 1;
            bodyMatchIndexRanges.push([start, end]);
            index = body.indexOf(searchQuery, index + 1);
          }

          //nodes.length === groupedOffsets.length
          const groupedOffsets: number[][] = [];
          let nodes: TextNode[] = [];

          //each match
          for (const [startsInBody, endsInBody] of bodyMatchIndexRanges) {
            nodes = nodes.concat(Array.from(new Set([...textNodeIndex.slice(startsInBody, endsInBody + 1)])));
            const allOffsets = offsetIndex.slice(startsInBody, endsInBody + 1); //[0,1,2] or [1,2,0] or [3,1,2] etc ...
            let currList: number[] = [];
            //offset can span nodes so need to group like [1/2-match][1/2-match]
            for (let i = 0; i < allOffsets.length; i++) {
              if ((allOffsets[i - 1] ?? Infinity) < allOffsets[i]) {
                currList.push(allOffsets[i]);
              } else {
                currList = [allOffsets[i]];
                groupedOffsets.push(currList);
              }
            }
          }
          console.log(">>>", groupedOffsets);
          console.log(nodes);
          for (const [startsInBody, endsInBody] of bodyMatchIndexRanges) {
            for (let bodyIndex = startsInBody; bodyIndex <= endsInBody; bodyIndex++) {
              const node = textNodeIndex[bodyIndex];

              const offsets = [offsetIndex[bodyIndex]];
              for (let index = bodyIndex + 1; offsetIndex[index] ?? -Infinity >= offsets.at(-1)!; index++) {
                offsets.push(index);
              }
              console.log(offsets.slice().map((idx) => node.getTextContent()[idx]));
              const startOffset = Math.min(...offsets);
              const endOffset = Math.max(...offsets);

              if (node.getTextContentSize() - 1 === endOffset) {
                //already cut
                if (!node.hasFormat("highlight")) {
                  // console.log(`highlighting node ${node.getKey()} : ${node.getTextContent()}`);
                  node.toggleFormat("highlight");
                } else {
                  // console.log(`skipping highlighting node ${node.getKey()} : ${node.getTextContent()}`);
                }
              } else {
                // console.log(`splitting node ${node.getKey()} : ${node.getTextContent()}`);
                //cut node wait for next cycle to draw higlights
                const { m: middleNode } = spliceNode(node, startOffset, endOffset);
                if (middleNode && !middleNode.hasFormat("highlight")) {
                  middleNode.toggleFormat("highlight");
                }
              }
              bodyIndex += endOffset;
            }
          }
        });
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
