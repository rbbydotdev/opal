import { Workspace } from "@/Db/Workspace";
import { CodeMirrorHighlightURLRange } from "@/components/Editor/CodeMirrorSelectURLRangePlugin";
import { MdxSearchToolbar } from "@/components/Editor/MdxSeachToolbar";
import { historyPlugin } from "@/components/Editor/historyPlugin";
import { searchPlugin } from "@/components/Editor/searchPlugin";
import { urlParamViewModePlugin } from "@/components/Editor/urlParamViewModePlugin";
import { useImagesPlugin } from "@/components/Editor/useImagesPlugin";
import { useFileContents } from "@/context/WorkspaceHooks";
import {
  AdmonitionDirectiveDescriptor,
  CodeMirrorEditor,
  KitchenSinkToolbar,
  SandpackConfig,
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
  remoteRealmPlugin,
  sandpackPlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
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

export function useAllPlugins({ currentWorkspace, realmId }: { currentWorkspace: Workspace; realmId: string }) {
  const { initialContents } = useFileContents();
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
      remoteRealmPlugin({ editorId: realmId }),
      listsPlugin(),
      quotePlugin(),
      headingsPlugin({ allowedHeadingLevels: [1, 2, 3, 4] }),
      linkPlugin(),
      searchPlugin(),
      historyPlugin({
        editHistoryId: "foobar",
      }),
      linkDialogPlugin(),
      urlParamViewModePlugin({ type: "search" }),
      workspaceImagesPlugin,
      tablePlugin(),
      thematicBreakPlugin(),
      frontmatterPlugin(),
      codeBlockPlugin({
        defaultCodeBlockLanguage: "js",
        codeBlockEditorDescriptors: [{ priority: -10, match: (_) => true, Editor: CodeMirrorEditor }],
      }),
      sandpackPlugin({ sandpackConfig: virtuosoSampleSandpackConfig }),
      codeMirrorPlugin({
        codeBlockLanguages: { js: "JavaScript", css: "CSS", txt: "Plain Text", tsx: "TypeScript", "": "Unspecified" },
      }),
      directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
      diffSourcePlugin({
        viewMode: "rich-text",
        diffMarkdown: String(initialContents ?? ""),
        codeMirrorExtensions: [CodeMirrorHighlightURLRange()],
      }),
      markdownShortcutPlugin(),
    ],
    [initialContents, realmId, workspaceImagesPlugin]
  );
}
