import { useSnapHistoryDB } from "@/Db/HistoryDAO";
import { Workspace } from "@/Db/Workspace";
import { CodeMirrorHighlightURLRange } from "@/components/Editor/CodeMirrorSelectURLRangePlugin";
// import { LivePreviewButton } from "@/components/Editor/LivePreviewButton";
import { MdxSearchToolbar } from "@/components/Editor/MdxSeachToolbar";
import { MdxToolbar } from "@/components/Editor/MdxToolbar";
import { EditHistoryMenu } from "@/components/Editor/history/EditHistoryMenu";
import { searchPlugin } from "@/components/Editor/searchPlugin";
import { handleUrlParamViewMode } from "@/components/Editor/urlParamViewModePlugin";
import { useImagesPlugin } from "@/components/Editor/useImagesPlugin";
import { useFileContents } from "@/context/WorkspaceHooks";
import {
  AdmonitionDirectiveDescriptor,
  CodeMirrorEditor,
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
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  useRemoteMDXEditorRealm,
} from "@mdxeditor/editor";
import { useEffect, useMemo } from "react";
import { useWorkspaceDocumentId } from "./history/useWorkspaceDocumentId";

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
                {/* <LivePreviewButton disabled={mimeType !== "text/markdown"} /> */}
                <MdxSearchToolbar />
                <MdxToolbar />
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
        // sandpackPlugin({ sandpackConfig: virtuosoSampleSandpackConfig }),
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
