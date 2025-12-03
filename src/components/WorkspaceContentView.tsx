import { useAllPlugins } from "@/app/editor/AllPlugins";
import { MainEditorRealmId, MdxEditorScrollSelector } from "@/app/editor/EditorConst";
import { SnapApiPoolProvider } from "@/app/editor/history/SnapApiPoolProvider";
import { useFileContents } from "@/context/useFileContents";
import { useCurrentFilepath } from "@/context/WorkspaceContext";
import { HistorySnapDBProvider } from "@/data/dao/HistoryDAO";
import { useWatchElement } from "@/hooks/useWatchElement";
import { AbsPath } from "@/lib/paths2";
import { ScrollSync } from "@/lib/useScrollSync";
import { Workspace } from "@/workspace/Workspace";
import { MDXEditor, MDXEditorMethods } from "@mdxeditor/editor";
import { default as graymatter, default as matter } from "gray-matter";
import { ComponentProps, useMemo, useRef } from "react";
import { useToggleEditHistory } from "../app/editor/history/useToggleEditHistory";
import { useToggleHistoryImageGeneration } from "../app/editor/history/useToggleHistoryImageGeneration";
import { useWorkspaceDocumentId } from "../app/editor/history/useWorkspaceDocumentId";

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
  const { isEditHistoryEnabled } = useToggleEditHistory();
  const documentId = isEditHistoryEnabled ? useWorkspaceDocumentId(contents) : "";

  const markdown = String(contents || "");
  const { data, content } = useMemo(() => {
    const md = matter(markdown);
    const frontmatter = isEditHistoryEnabled && documentId ? { documentId, ...(md.data ?? {}) } : (md.data ?? {});
    return { data: frontmatter, content: md.content };
  }, [documentId, markdown, isEditHistoryEnabled]);
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
