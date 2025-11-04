import { useAllPlugins } from "@/components/Editor/AllPlugins";
import { MainEditorRealmId, MdxEditorScrollSelector } from "@/components/Editor/EditorConst";
import { SnapApiPoolProvider } from "@/components/Editor/history/SnapApiPoolProvider";
import { useFileContents } from "@/context/useFileContents";
import { useCurrentFilepath } from "@/context/WorkspaceContext";
import { HistorySnapDBProvider } from "@/data/HistoryDAO";
import { Workspace } from "@/data/Workspace";
import { useToggleHistoryImageGeneration } from "./Editor/history/useToggleHistoryImageGeneration";
// import { DropCommanderProvider } from "@/features/filetree-drag-and-drop/DropCommander";
import { useWatchElement } from "@/hooks/useWatchElement";
import { AbsPath } from "@/lib/paths2";
import { ScrollSync } from "@/lib/useScrollSync";
import { MDXEditor, MDXEditorMethods } from "@mdxeditor/editor";
import { default as graymatter, default as matter } from "gray-matter";
import { ComponentProps, useMemo, useRef } from "react";
import { useWorkspaceDocumentId } from "./Editor/history/useWorkspaceDocumentId";

export function WorkspaceMarkdownEditor({
  currentWorkspace,
  contents,
  // extPreviewCtrl,
  path,
}: {
  currentWorkspace: Workspace;
  contents: string | null;
  path: AbsPath;
  // extPreviewCtrl: React.RefObject<WindowPreviewHandler | null>;
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

  const mdxEditorElement = useWatchElement(MdxEditorScrollSelector);
  const documentId = useWorkspaceDocumentId(contents);

  const markdown = String(contents || "");
  const { data, content } = useMemo(() => {
    const md = matter(markdown);
    return { data: { documentId, ...(md.data ?? {}) }, content: md.content };
  }, [documentId, markdown]);
  const { isHistoryImageGenerationEnabled } = useToggleHistoryImageGeneration();
  if (contents === null || !currentWorkspace) return null;
  return (
    <div className="flex flex-col h-full relative">
      <ScrollSync
        elementRef={{ current: mdxEditorElement as HTMLElement }}
        path={path}
        workspaceName={currentWorkspace.name}
      >
        <SnapApiPoolProvider max={isHistoryImageGenerationEnabled ? 1 : 0}>
          <HistorySnapDBProvider documentId={documentId} workspaceId={currentWorkspace.id}>
            <EditorWithPlugins
              mimeType={mimeType}
              currentWorkspace={currentWorkspace}
              editorRef={editorRef}
              onChange={(md) => updateDebounce(matter.stringify(md, data))}
              markdown={content}
              className={"bg-background flex-grow flex-col h-full "}
              contentEditableClassName="max-w-full content-editable prose dark:prose-invert bg-background"
            />
          </HistorySnapDBProvider>
        </SnapApiPoolProvider>
      </ScrollSync>
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
