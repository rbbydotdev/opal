import { useSnapHistoryDB } from "@/Db/HistoryDAO";
import { Workspace } from "@/Db/Workspace";
import { LivePreviewButtons } from "@/components/Editor/LivePreviewButton";
import { MdxSearchToolbar } from "@/components/Editor/MdxSeachToolbar";
import { MdxToolbar } from "@/components/Editor/MdxToolbar";
import { SourceEditorButton } from "@/components/Editor/SourceEditorButton";
import { EditHistoryMenu } from "@/components/Editor/history/EditHistoryMenu";
import { useEditorHistoryPlugin2WithRealm } from "@/components/Editor/history/useEditorHistoryPlugin2WithRealm";
import { useWorkspaceDocumentId } from "@/components/Editor/history/useWorkspaceDocumentId";
import { searchPlugin } from "@/components/Editor/searchPlugin";
import { useImagesPlugin } from "@/components/Editor/useImagesPlugin";
import { useFileContents } from "@/context/useFileContents";
import {
  AdmonitionDirectiveDescriptor,
  CodeMirrorEditor,
  codeBlockPlugin,
  codeMirrorPlugin,
  directivesPlugin,
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

export function useAllPlugins({
  currentWorkspace,
  realmId,
  mimeType,
}: {
  currentWorkspace: Workspace;
  realmId: string;
  mimeType: string;
}) {
  const { contents, writeFileContents } = useFileContents({ currentWorkspace });
  const workspaceImagesPlugin = useImagesPlugin({ currentWorkspace });
  // //TODO heal documentId or prevent erasure
  const documentId = useWorkspaceDocumentId(String(contents || ""));
  const realm = useRemoteMDXEditorRealm(realmId);
  const historyDB = useSnapHistoryDB();

  useEffect(() => {
    if (mimeType === "text/markdown") return;
    document.body.classList.add("hide-rich-text");
    return () => {
      document.body.classList.remove("hide-rich-text");
    };
  }, [mimeType]);

  const {
    triggerSave,
    isRestoreState,
    edits,
    selectedEdit,
    selectedEditMd,
    setEdit,
    clearAll,
    rebaseHistory,
    resetAndRestore,
  } = useEditorHistoryPlugin2WithRealm({
    workspaceId: currentWorkspace.id,
    documentId,
    historyStorage: historyDB,
    rootMarkdown: String(contents ?? ""),
    realm,
  });

  return useMemo(
    () =>
      [
        toolbarPlugin({
          toolbarContents: () => (
            <>
              <SourceEditorButton />
              <EditHistoryMenu
                finalizeRestore={writeFileContents}
                edits={edits}
                selectedEdit={selectedEdit}
                setEdit={setEdit}
                rebaseHistory={rebaseHistory}
                resetAndRestore={resetAndRestore}
                clearAll={clearAll}
                triggerSave={triggerSave}
                isRestoreState={isRestoreState}
                selectedEditMd={selectedEditMd}
              />
              <LivePreviewButtons />
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
        codeBlockPlugin({
          defaultCodeBlockLanguage: "js",
          codeBlockEditorDescriptors: [{ priority: -10, match: (_) => true, Editor: CodeMirrorEditor }],
        }),
        codeMirrorPlugin({
          codeBlockLanguages: { js: "JavaScript", css: "CSS", txt: "Plain Text", tsx: "TypeScript", "": "Unspecified" },
        }),
        directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
        markdownShortcutPlugin(),
      ].filter(Boolean),
    [
      clearAll,
      edits,
      isRestoreState,
      realmId,
      rebaseHistory,
      resetAndRestore,
      selectedEdit,
      selectedEditMd,
      setEdit,
      triggerSave,
      workspaceImagesPlugin,
    ]
  );
}
