import { useAllPlugins } from "@/components/Editor/AllPlugins";
import { MainEditorRealmId, MdxEditorSelector } from "@/components/Editor/EditorConst";
import { SnapApiPoolProvider } from "@/components/Editor/history/SnapApiPoolProvider";
import { useToggleHistoryImageGeneration } from "@/components/Editor/history/EditHistoryMenu";
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

export function WorkspaceMarkdownEditor({
  currentWorkspace,
  contents,
  path,
}: {
  currentWorkspace: Workspace;
  contents: string | null;
  path: AbsPath;
}) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const { updateDebounce, error } = useFileContents({
    path,
    currentWorkspace,
    onContentChange: (c) => {
      //for external changes
      editorRef.current?.setMarkdown(graymatter(c).content);
    },
  });
  if (error) throw error;

  const { mimeType } = useCurrentFilepath();

  const { scrollEmitter, sessionId } = useWorkspacePathScrollChannel();

  const mdxEditorElement = useWatchElement(MdxEditorSelector);

  const documentId = useWorkspaceDocumentId(contents);

  const markdown = String(contents || "");
  const { data, content } = useMemo(() => {
    const md = matter(markdown);
    return { data: { documentId, ...(md.data ?? {}) }, content: md.content };
  }, [documentId, markdown]);
  const { isHistoryImageGenerationEnabled } = useToggleHistoryImageGeneration();
  if (contents === null || !currentWorkspace) return null;
  return (
    <ScrollSyncProvider scrollEl={mdxEditorElement as HTMLElement} scrollEmitter={scrollEmitter} sessionId={sessionId}>
      <div className="flex flex-col h-full relative">
        <SnapApiPoolProvider max={isHistoryImageGenerationEnabled ? 1 : 0}>
          <HistorySnapDBProvider documentId={documentId} workspaceId={currentWorkspace.id}>
            <DropCommanderProvider>
              <EditorWithPlugins
                mimeType={mimeType}
                currentWorkspace={currentWorkspace}
                editorRef={editorRef}
                onChange={(md) => updateDebounce(matter.stringify(md, data))}
                markdown={content}
                // markdown={contents ?? ""}
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
