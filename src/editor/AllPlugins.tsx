import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useFileContents } from "@/context/useFileContents";
import { useSnapHistoryDB } from "@/data/dao/HistorySnapDBContext";
import { customCodeMirrorTheme } from "@/editor/codeMirrorCustomTheme";
import { EditHistoryMenu } from "@/editor/history/EditHistoryMenu";
import { useEditorHistoryPluginWithRealm } from "@/editor/history/useEditorHistoryPluginWithRealm";
import { useWorkspaceDocumentId } from "@/editor/history/useWorkspaceDocumentId";
import { LivePreviewButtons } from "@/editor/LivePreviewButton";
import { MdxSearchToolbar } from "@/editor/MdxSeachToolbar";
import { MdxToolbar } from "@/editor/MdxToolbar";
import { searchPlugin } from "@/editor/searchPlugin";
import { SourceEditorButton } from "@/editor/SourceEditorButton";
import { useImagesPlugin } from "@/editor/useImagesPlugin";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSidebarPanes } from "@/layouts/EditorSidebarLayout";
import { cn } from "@/lib/utils";
import { Workspace } from "@/workspace/Workspace";
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

function SpellCheckSwitch() {
  const { storedValue: spellCheck, setStoredValue: setSpellCheck } = useLocalStorage("Editor/spellcheck", true);

  return (
    <Label htmlFor="mdxSpellCheck" className="p-2 border bg-accent rounded flex items-center gap-1 select-none">
      <span className="text-sm whitespace-nowrap truncate">Spellcheck</span>
      <Switch
        id="mdxSpellCheck"
        className="ml-1"
        checked={spellCheck}
        onCheckedChange={(checked) => setSpellCheck(checked)}
        aria-label="Enable spellcheck"
      />
    </Label>
  );
}

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

                <div className="ml-auto">
                  <SpellCheckSwitch />
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
          autoLoadLanguageSupport: true,
          codeMirrorExtensions: [customCodeMirrorTheme],
        }),
        directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
        markdownShortcutPlugin(),
      ].filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentWorkspace, documentId, realm, realmId, workspaceImagesPlugin, writeFileContents]
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
  } = useEditorHistoryPluginWithRealm({
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
