import { useAllPlugins } from "@/components/Editor/AllPlugins";
import { MainEditorRealmId, MdxEditorSelector } from "@/components/Editor/EditorConst";
import { SnapApiPoolProvider } from "@/components/Editor/history/SnapApiPoolProvider";
import { ScrollSyncProvider, useWorkspacePathScrollChannel } from "@/components/ScrollSync";
import { useFileContents } from "@/context/useFileContents";
import { useCurrentFilepath } from "@/context/WorkspaceContext";
import { HistorySnapDBProvider } from "@/Db/HistoryDAO";
import { Workspace } from "@/Db/Workspace";
import { DropCommanderProvider } from "@/features/filetree-drag-and-drop/DropCommander";
import { useWatchElement } from "@/hooks/useWatchElement";
import { AbsPath } from "@/lib/paths2";
import { MDXEditor, MDXEditorMethods } from "@mdxeditor/editor";
import { default as graymatter, default as matter } from "gray-matter";
import { ComponentProps, useMemo, useRef } from "react";
import { useWorkspaceDocumentId } from "./Editor/history/useWorkspaceDocumentId";

export function WorkspaceMarkdownEditor({ currentWorkspace, path }: { currentWorkspace: Workspace; path: AbsPath }) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const {
    contents: initialContents,
    updateDebounce,
    error,
  } = useFileContents({
    path,
    currentWorkspace,
    onContentChange: (c) => {
      editorRef.current?.setMarkdown(graymatter(c).content);
    },
  });

  if (error) throw error;

  const { mimeType } = useCurrentFilepath();

  const { scrollEmitter, sessionId } = useWorkspacePathScrollChannel();

  const mdxEditorElement = useWatchElement(MdxEditorSelector);

  const documentId = useWorkspaceDocumentId(initialContents);

  const markdown = String(initialContents || "");
  const { data, content } = useMemo(() => {
    const md = matter(markdown);
    return { data: { documentId, ...(md.data ?? {}) }, content: md.content };
  }, [documentId, markdown]);
  if (initialContents === null || !currentWorkspace) return null;
  return (
    <ScrollSyncProvider scrollEl={mdxEditorElement as HTMLElement} scrollEmitter={scrollEmitter} sessionId={sessionId}>
      <div className="flex flex-col h-full relative">
        <SnapApiPoolProvider max={1}>
          <HistorySnapDBProvider documentId={documentId} workspaceId={currentWorkspace.id}>
            <DropCommanderProvider>
              <EditorWithPlugins
                mimeType={mimeType}
                currentWorkspace={currentWorkspace}
                editorRef={editorRef}
                onChange={(md) => updateDebounce(matter.stringify(md, data))}
                markdown={content}
                className={"bg-background flex-grow  flex-col h-full"}
                contentEditableClassName="max-w-full content-editable prose dark:prose-invert bg-background"
              />
            </DropCommanderProvider>
          </HistorySnapDBProvider>
        </SnapApiPoolProvider>
      </div>
    </ScrollSyncProvider>
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
