import { useSnapHistoryDB } from "@/Db/HistoryDAO";
import { Workspace } from "@/Db/Workspace";
import { LivePreviewButton } from "@/components/Editor/LivePreviewButton";
import { MdxSearchToolbar } from "@/components/Editor/MdxSeachToolbar";
import { MdxToolbar } from "@/components/Editor/MdxToolbar";
import { EditHistoryMenu } from "@/components/Editor/history/EditHistoryMenu";
import { searchPlugin } from "@/components/Editor/searchPlugin";
import { useImagesPlugin } from "@/components/Editor/useImagesPlugin";
import { setViewMode } from "@/components/Editor/view-mode/handleUrlParamViewMode";
import { Button } from "@/components/ui/button";
import { useFileContents } from "@/context/WorkspaceHooks";
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
  useRemoteMDXEditorRealm,
} from "@mdxeditor/editor";
import { ChevronRightIcon, FileText } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useWorkspaceDocumentId } from "./history/useWorkspaceDocumentId";

const SourceEditorButton = () => (
  <Button variant="outline" size="sm" onClick={() => setViewMode("source", "hash")}>
    <span className="text-xs flex justify-center items-center gap-1">
      Source
      <FileText size={12} />
      <ChevronRightIcon size={12} />
    </span>
  </Button>
);

export function useAllPlugins({
  currentWorkspace,
  realmId,
  mimeType,
}: {
  currentWorkspace: Workspace;
  realmId: string;
  mimeType: string;
}) {
  const { initialContents, debouncedUpdate } = useFileContents({ currentWorkspace });
  const workspaceImagesPlugin = useImagesPlugin({ currentWorkspace });
  //TODO heal documentId or prevent erasure
  const documentId = useWorkspaceDocumentId(String(initialContents || ""));
  const realm = useRemoteMDXEditorRealm(realmId);
  const historyDB = useSnapHistoryDB();

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
          toolbarContents: () => (
            <>
              <SourceEditorButton />
              <EditHistoryMenu
                documentId={documentId}
                historyStorage={historyDB}
                rootMarkdown={String(initialContents ?? "")}
                finalizeRestore={(md) => debouncedUpdate(md)}
                disabled={mimeType !== "text/markdown"}
                realm={realm}
              />
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
        // sandpackPlugin({ sandpackConfig: virtuosoSampleSandpackConfig }),
        codeMirrorPlugin({
          codeBlockLanguages: { js: "JavaScript", css: "CSS", txt: "Plain Text", tsx: "TypeScript", "": "Unspecified" },
        }),
        directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
        /*diffSourcePlugin({
          viewMode: finalViewMode,
          diffMarkdown: String(initialContents ?? ""),
          codeMirrorExtensions: [CodeMirrorHighlightURLRange()],
        }),*/
        markdownShortcutPlugin(),
      ].filter(Boolean),
    [debouncedUpdate, documentId, historyDB, initialContents, mimeType, realm, realmId, workspaceImagesPlugin]
  );
}
