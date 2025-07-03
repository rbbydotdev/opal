import { Workspace } from "@/Db/Workspace";
import { CodeMirrorHighlightURLRange } from "@/components/Editor/CodeMirrorHighlightURLRange";
import { MdxSearchToolbar } from "@/components/Editor/MdxSeachToolbar";
import { searchMarkdownPlugin } from "@/components/Editor/markdownSearchPlugin";
import { searchPlugin } from "@/components/Editor/searchPlugin";
import { useImagesPlugin } from "@/components/Editor/useImagesPlugin";
import { useFileContents } from "@/context/WorkspaceHooks";
import {
  AdmonitionDirectiveDescriptor,
  KitchenSinkToolbar,
  SandpackConfig,
  ViewMode,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  directivesPlugin,
  frontmatterPlugin,
  headingsPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  realmPlugin,
  remoteRealmPlugin,
  sandpackPlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  viewMode$,
} from "@mdxeditor/editor";
import { useMemo } from "react";
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

const urlParamViewModePlugin = realmPlugin({
  postInit(realm, params?: { type?: "hash" | "search"; key?: string }) {
    const windowHref = window.location.href;
    const urlParams =
      (params?.type ?? "hash") === "hash"
        ? new URLSearchParams(new URL(windowHref).hash.slice(1))
        : new URL(windowHref).searchParams;

    const viewMode = urlParams.get(params?.key ?? "viewMode");
    if (!viewMode) return;
    const viewModes: Array<ViewMode> = ["rich-text", "source", "diff"];
    if (viewMode && typeof viewMode === "string" && viewModes.includes(viewMode)) {
      realm.pub(viewMode$, viewMode);
    }
  },
});
export function useAllPlugins({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const { contents } = useFileContents();
  const workspaceImagesPlugin = useImagesPlugin({ currentWorkspace });

  return useMemo(
    () => [
      toolbarPlugin({
        toolbarContents: () => (
          <>
            <MdxSearchToolbar /> <KitchenSinkToolbar />
          </>
        ),
      }),
      remoteRealmPlugin({ editorId: "MdxEditorRealm" }),
      searchMarkdownPlugin(),
      listsPlugin(),
      quotePlugin(),
      headingsPlugin({ allowedHeadingLevels: [1, 2, 3, 4] }),
      linkPlugin(),
      searchPlugin(),
      linkDialogPlugin(),
      urlParamViewModePlugin(),
      workspaceImagesPlugin,
      tablePlugin(),
      thematicBreakPlugin(),
      frontmatterPlugin(),
      codeBlockPlugin({ defaultCodeBlockLanguage: "" }),
      sandpackPlugin({ sandpackConfig: virtuosoSampleSandpackConfig }),
      codeMirrorPlugin({
        codeBlockLanguages: { js: "JavaScript", css: "CSS", txt: "Plain Text", tsx: "TypeScript", "": "Unspecified" },
      }),
      directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
      diffSourcePlugin({
        viewMode: "rich-text",
        diffMarkdown: contents,
        codeMirrorExtensions: [CodeMirrorHighlightURLRange()],
      }),
      markdownShortcutPlugin(),
    ],
    [contents, workspaceImagesPlugin]
  );
}
