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
import { useSnapHistoryDB } from "@/data/DAO/HistoryDAO";
import { Workspace } from "@/data/Workspace";
import { useSidebarPanes } from "@/features/preview-pane/EditorSidebarLayout";
import { cn } from "@/lib/utils";
import {
  AdmonitionDirectiveDescriptor,
  CodeMirrorEditor,
  Realm,
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
import { useToggleEditHistory } from "./history/useToggleEditHistory";

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
  const { isEditHistoryEnabled } = useToggleEditHistory();

  const documentId = isEditHistoryEnabled ? useWorkspaceDocumentId(contents) : "";

  const realm = useRemoteMDXEditorRealm(realmId);
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
          toolbarContents: () => {
            const { left } = useSidebarPanes();
            return (
              <div
                className={cn("flex gap-1 w-full", {
                  "ml-0": !left.isCollapsed,
                  "ml-16": left.isCollapsed,
                })}
              >
                <SourceEditorButton />
                <EditHistoryMenuWithRealm
                  currentWorkspace={currentWorkspace}
                  documentId={documentId}
                  contents={contents}
                  writeFileContents={writeFileContents}
                  realm={realm}
                />
                <LivePreviewButtons />
                <MdxSearchToolbar />

                <div className="flex-grow flex justify-start ml-2">
                  <MdxToolbar />
                </div>
              </div>
            );
          },
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
    [contents, currentWorkspace, documentId, realm, realmId, workspaceImagesPlugin, writeFileContents]
  );
}

function EditHistoryMenuWithRealm({
  currentWorkspace,
  documentId,
  contents,
  writeFileContents,
  realm,
}: {
  currentWorkspace: Workspace;
  documentId: string;
  contents: string | null;
  writeFileContents: (newContents: string) => void;
  realm: Realm | undefined;
}) {
  const { isEditHistoryEnabled } = useToggleEditHistory();

  if (!isEditHistoryEnabled) {
    return <EditHistoryMenu disabled />;
  }

  return (
    <EditHistoryMenuEnabled
      currentWorkspace={currentWorkspace}
      documentId={documentId}
      contents={contents}
      writeFileContents={writeFileContents}
      realm={realm}
    />
  );
}

function EditHistoryMenuEnabled({
  currentWorkspace,
  documentId,
  contents,
  writeFileContents,
  realm,
}: {
  currentWorkspace: Workspace;
  documentId: string;
  contents: string | null;
  writeFileContents: (newContents: string) => void;
  realm: Realm | undefined;
}) {
  const historyDB = useSnapHistoryDB();

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
    enabled: true,
  });

  return (
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
  );
}
