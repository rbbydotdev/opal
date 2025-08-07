import { useSnapHistoryDB } from "@/Db/HistoryDAO";
import { Workspace } from "@/Db/Workspace";
import { CodeMirrorHighlightURLRange } from "@/components/Editor/CodeMirrorSelectURLRangePlugin";
import { LivePreviewButton } from "@/components/Editor/LivePreviewButton";
import { MdxSearchToolbar } from "@/components/Editor/MdxSeachToolbar";
import { EditHistoryMenu } from "@/components/Editor/history/EditHistoryMenu";
import { searchPlugin } from "@/components/Editor/searchPlugin";
import { handleUrlParamViewMode } from "@/components/Editor/urlParamViewModePlugin";
import { useImagesPlugin } from "@/components/Editor/useImagesPlugin";
import { useFileContents } from "@/context/WorkspaceHooks";
import {
  AdmonitionDirectiveDescriptor,
  CodeMirrorEditor,
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
  remoteRealmPlugin,
  sandpackPlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  useRemoteMDXEditorRealm,
} from "@mdxeditor/editor";
import { useEffect, useMemo } from "react";
import { useWorkspaceDocumentId } from "./history/useWorkspaceDocumentId";
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

export function useAllPlugins({
  currentWorkspace,
  realmId,
  mimeType,
  viewMode = "rich-text",
}: {
  currentWorkspace: Workspace;
  realmId: string;
  mimeType: string;
  viewMode?: ViewMode;
}) {
  const { initialContents, debouncedUpdate } = useFileContents({ currentWorkspace });
  const workspaceImagesPlugin = useImagesPlugin({ currentWorkspace });
  //TODO heal documentId or prevent erasure
  const documentId = useWorkspaceDocumentId(String(initialContents || ""));
  const realm = useRemoteMDXEditorRealm(realmId);
  const viewModeOverride = useMemo(() => handleUrlParamViewMode("search", "viewMode"), []);
  const historyDB = useSnapHistoryDB();
  const finalViewMode = (viewModeOverride as ViewMode) || viewMode || "source";

  useEffect(() => {
    if (mimeType === "text/markdown") return;
    document.body.classList.add("hide-rich-text");
    return () => {
      document.body.classList.remove("hide-rich-text");
    };
  }, [mimeType]);

  return useMemo(
    () =>
      [
        toolbarPlugin({
          toolbarContents: () =>
            finalViewMode === "source" ? (
              <div className="h-[1.875rem] text-sm flex justify-center items-center">Source Mode</div>
            ) : (
              <>
                <EditHistoryMenu
                  documentId={documentId}
                  historyStorage={historyDB}
                  rootMarkdown={String(initialContents ?? "")}
                  finalizeRestore={(md) => debouncedUpdate(md)}
                  disabled={mimeType !== "text/markdown"}
                  realm={realm}
                />
                <LivePreviewButton disabled={mimeType !== "text/markdown"} />
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
        linkDialogPlugin(),
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
          viewMode: finalViewMode,
          diffMarkdown: String(initialContents ?? ""),
          codeMirrorExtensions: [CodeMirrorHighlightURLRange()],
        }),
        markdownShortcutPlugin(),
      ].filter(Boolean),
    [
      debouncedUpdate,
      documentId,
      finalViewMode,
      historyDB,
      initialContents,
      mimeType,
      realm,
      realmId,
      workspaceImagesPlugin,
    ]
  );
}
