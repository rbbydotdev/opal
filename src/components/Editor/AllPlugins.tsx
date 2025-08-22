import { useSnapHistoryDB } from "@/Db/HistoryDAO";
import { Workspace } from "@/Db/Workspace";
import { MdxEditorSelector } from "@/components/Editor/EditorConst";
import { LivePreviewButton } from "@/components/Editor/LivePreviewButton";
import { MdxSearchToolbar } from "@/components/Editor/MdxSeachToolbar";
import { MdxToolbar } from "@/components/Editor/MdxToolbar";
import { EditHistoryMenu } from "@/components/Editor/history/EditHistoryMenu";
import { useEditorHistoryPlugin2WithContentWatch } from "@/components/Editor/history/useEditorHistoryPlugin2WithContentWatch";
import { searchPlugin } from "@/components/Editor/searchPlugin";
import { useImagesPlugin } from "@/components/Editor/useImagesPlugin";
import { setViewMode } from "@/components/Editor/view-mode/handleUrlParamViewMode";
import { Button } from "@/components/ui/button";
import { useFileContents } from "@/context/useFileContents";
import {
  AdmonitionDirectiveDescriptor,
  CodeMirrorEditor,
  codeBlockPlugin,
  codeMirrorPlugin,
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
} from "@mdxeditor/editor";
import { ChevronRightIcon, FileText } from "lucide-react";
import { useEffect, useMemo } from "react";

const SourceEditorButton = () => (
  <Button variant="outline" size="sm" onClick={() => setViewMode("source", "hash")}>
    <span className="text-xs flex justify-center items-center gap-1">
      Source
      <FileText size={12} />
      <ChevronRightIcon size={12} />
    </span>
  </Button>
);

function MdxEditorInFocus() {
  console.log(Boolean(document.activeElement?.closest(MdxEditorSelector)));
  return Boolean(document.activeElement?.closest(MdxEditorSelector));
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
  // const { initialContents, debouncedUpdate } = useFileContents({ currentWorkspace });
  const { updateDebounce } = useFileContents({ currentWorkspace });
  const workspaceImagesPlugin = useImagesPlugin({ currentWorkspace });
  // //TODO heal documentId or prevent erasure
  // const documentId = useWorkspaceDocumentId(String(initialContents || ""));
  // const realm = useRemoteMDXEditorRealm(realmId);
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
  } = useEditorHistoryPlugin2WithContentWatch({
    workspaceId: currentWorkspace.id,
    historyStorage: historyDB,
    shouldTrigger: MdxEditorInFocus,
  });

  // const {
  //   triggerSave,
  //   isRestoreState,
  //   edits,
  //   selectedEdit,
  //   selectedEditMd,
  //   setEdit,
  //   clearAll,
  //   rebaseHistory,
  //   resetAndRestore,
  // } = useEditorHistoryPlugin2WithRealm({
  //   workspaceId: currentWorkspace.id,
  //   documentId,
  //   historyStorage: historyDB,
  //   rootMarkdown: String(initialContents ?? ""),
  //   realm,
  // });

  return useMemo(
    () =>
      [
        toolbarPlugin({
          toolbarContents: () => (
            <>
              <SourceEditorButton />
              {false && (
                <EditHistoryMenu
                  finalizeRestore={(md) => updateDebounce(md)}
                  disabled={mimeType !== "text/markdown"}
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
              )}
              <LivePreviewButton disabled={mimeType !== "text/markdown"} />
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
        codeMirrorPlugin({
          codeBlockLanguages: { js: "JavaScript", css: "CSS", txt: "Plain Text", tsx: "TypeScript", "": "Unspecified" },
        }),
        directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
        markdownShortcutPlugin(),
      ].filter(Boolean),
    [
      clearAll,
      updateDebounce,
      edits,
      isRestoreState,
      mimeType,
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
