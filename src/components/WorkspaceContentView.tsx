import { useAllPlugins } from "@/components/Editor/AllPlugins";
import { MainEditorRealmId, MdxEditorSelector } from "@/components/Editor/EditorConst";
import { SnapApiPoolProvider } from "@/components/Editor/history/SnapApiPoolProvider";
import { ScrollSyncProvider, useScrollChannel } from "@/components/ScrollSync";
import { useFileContents } from "@/context/useFileContents";
import { useCurrentFilepath, useWorkspaceRoute } from "@/context/WorkspaceContext";
import { HistorySnapDBProvider } from "@/Db/HistoryDAO";
import { Workspace } from "@/Db/Workspace";
import { DropCommanderProvider } from "@/features/filetree-drag-and-drop/DropCommander";
import { useWatchElement } from "@/hooks/useWatchElement";
import { MDXEditor, MDXEditorMethods } from "@mdxeditor/editor";
import { ComponentProps, useRef } from "react";
import { useWorkspaceDocumentId } from "./Editor/history/useWorkspaceDocumentId";

import "@mdxeditor/editor/style.css";

export function WorkspaceMarkdownEditor({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const { initialContents, updateDebounce, error } = useFileContents({
    currentWorkspace,
    listenerCb: (newContent) => {
      //this is for out of editor updates like via another opened window or image path updates
      editorRef.current?.setMarkdown(newContent ?? "");
    },
  });

  if (error) throw error;

  const { id, path } = useWorkspaceRoute();
  const { mimeType } = useCurrentFilepath();

  const { scrollEmitter, sessionId } = useScrollChannel({ sessionId: `${id}${path}` });

  const mdxEditorElement = useWatchElement(MdxEditorSelector);

  const documentId = useWorkspaceDocumentId(initialContents) ?? "unknown";

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
                onChange={updateDebounce}
                markdown={String(initialContents || "")}
                className={"bg-background flex-grow  flex-col h-full"}
                contentEditableClassName="max-w-full content-editable prose bg-background"
              />
            </DropCommanderProvider>
          </ScrollSyncProvider>
        </HistorySnapDBProvider>
      </SnapApiPoolProvider>
    </div>
  );
}

function EditorWithPlugins(
  props: ComponentProps<typeof MDXEditor> & {
    currentWorkspace: Workspace;
    mimeType: string;
    editorRef: React.RefObject<MDXEditorMethods | null>;
  }
) {
  const plugins = useAllPlugins({
    currentWorkspace: props.currentWorkspace,
    realmId: MainEditorRealmId,
    mimeType: props.mimeType,
  });

  return (
    <MDXEditor {...props} plugins={plugins} ref={props.editorRef} onChange={props.onChange} markdown={props.markdown} />
  );
}
