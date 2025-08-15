import { useAllPlugins } from "@/components/Editor/AllPlugins";
import { Editor } from "@/components/Editor/Editor";
import { MainEditorRealmId, MdxEditorSelector } from "@/components/Editor/EditorConst";
import { handleUrlParamViewMode } from "@/components/Editor/handleUrlParamViewMode";
import { SnapApiPoolProvider } from "@/components/Editor/history/SnapApiPoolProvider";
import { ScrollSyncProvider, useScrollChannel } from "@/components/ScrollSync";
import { SourceEditor } from "@/components/SourceEditor/SourceEditor";
import { TrashBanner } from "@/components/TrashBanner";
import { useCurrentFilepath, useFileContents, useWorkspaceRoute } from "@/context/WorkspaceHooks";
import { HistorySnapDBProvider } from "@/Db/HistoryDAO";
import { Workspace } from "@/Db/Workspace";
import { DropCommanderProvider } from "@/features/filetree-drag-and-drop/DropCommander";
import { useWatchElement } from "@/hooks/useWatchElement";
import { MDXEditorMethods } from "@mdxeditor/editor";
import { ComponentProps, useMemo, useRef } from "react";
import { useWorkspaceDocumentId } from "./Editor/history/useWorkspaceDocumentId";

export function WorkspaceContentView({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const viewModeOverride = useMemo(() => handleUrlParamViewMode("hash+search", "viewMode"), []);
  const { isMarkdown, filePath, inTrash, mimeType } = useCurrentFilepath();
  return (
    <>
      {inTrash && <TrashBanner filePath={filePath} />}
      {!isMarkdown || viewModeOverride === "source" ? (
        <SourceEditor mimeType={mimeType} currentWorkspace={currentWorkspace} />
      ) : (
        <WorkspaceMarkdownEditor currentWorkspace={currentWorkspace} />
      )}
    </>
  );
}

export function WorkspaceMarkdownEditor({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const { initialContents, debouncedUpdate, error } = useFileContents({
    currentWorkspace,
    listenerCb: (newContent) => {
      //this is for out of editor updates like via tab or image path updates
      editorRef.current?.setMarkdown(newContent ?? "");
    },
  });

  const { id, path } = useWorkspaceRoute();
  const { mimeType } = useCurrentFilepath();

  const { scrollEmitter, sessionId } = useScrollChannel({ sessionId: `${id}${path}` });

  const mdxEditorElement = useWatchElement(MdxEditorSelector);

  const documentId = useWorkspaceDocumentId(initialContents) ?? "unknown";

  if (error) throw error;

  if (initialContents === null || !currentWorkspace) return null;
  return (
    <div className="flex flex-col h-full relative">
      <SnapApiPoolProvider max={1}>
        <HistorySnapDBProvider documentId={documentId} workspaceId={currentWorkspace.id}>
          <ScrollSyncProvider
            scrollEl={mdxEditorElement as HTMLElement}
            scrollEmitter={scrollEmitter}
            sessionId={sessionId}
          >
            <DropCommanderProvider>
              <EditorWithPlugins
                mimeType={mimeType}
                currentWorkspace={currentWorkspace}
                editorRef={editorRef}
                onChange={debouncedUpdate}
                markdown={String(initialContents || "")}
                className={"bg-background flex-grow  flex-col"}
                contentEditableClassName="max-w-full content-editable prose bg-background"
              />
            </DropCommanderProvider>
          </ScrollSyncProvider>
        </HistorySnapDBProvider>
      </SnapApiPoolProvider>
    </div>
  );
}
function EditorWithPlugins(props: ComponentProps<typeof Editor> & { currentWorkspace: Workspace; mimeType: string }) {
  const plugins = useAllPlugins({
    currentWorkspace: props.currentWorkspace,
    realmId: MainEditorRealmId,
    mimeType: props.mimeType,
    viewMode: props.mimeType === "text/markdown" ? "rich-text" : "source",
  });
  return (
    <Editor
      {...props}
      plugins={plugins}
      editorRef={props.editorRef}
      onChange={props.onChange}
      markdown={props.markdown}
    />
  );
}
