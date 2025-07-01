import { Workspace } from "@/Db/Workspace";
import { MdxSearchToolbar } from "@/components/Editor/MdxSeachToolbar";
import { searchMarkdownPlugin } from "@/components/Editor/markdownSearchPlugin";
import { searchPlugin } from "@/components/Editor/searchPlugin";
import { ErrorPopupControl } from "@/components/ui/error-popup";
import { useFileContents, useWorkspaceRoute } from "@/context/WorkspaceHooks";
import { BadRequestError, isError } from "@/lib/errors";
import { dirname } from "@/lib/paths2";
import {
  AdmonitionDirectiveDescriptor,
  KitchenSinkToolbar,
  SandpackConfig,
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
  sandpackPlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from "@mdxeditor/editor";
import { useEffect, useMemo, useState } from "react";
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

export function useAllPlugins({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const [imgs, setImgs] = useState<string[]>([]);
  const { contents } = useFileContents();

  const { path } = useWorkspaceRoute();
  useEffect(() => {
    return currentWorkspace.watchDisk(() => {
      setImgs(currentWorkspace.getImages().map((i) => i));
    });
  }, [currentWorkspace]);

  return useMemo(
    () => [
      toolbarPlugin({
        toolbarContents: () => (
          <>
            <MdxSearchToolbar /> <KitchenSinkToolbar />
          </>
        ),
      }),
      searchMarkdownPlugin(),
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
            return currentWorkspace.uploadSingleImage(file, dirname(path ?? "/"));
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
      diffSourcePlugin({ viewMode: "rich-text", diffMarkdown: contents }),
      markdownShortcutPlugin(),
    ],
    [contents, currentWorkspace, imgs, path]
  );
}
