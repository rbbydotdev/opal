import { useFileContents } from "@/data/useFileContents";
import { MainEditorRealmId, MdxEditorScrollSelector } from "@/editors/EditorConst";
import { useDocHistory } from "@/editors/history/HistoryPlugin";
import { useAllPlugins } from "@/editors/markdown/AllPlugins";
import { ScrollSync } from "@/features/live-preview/useScrollSync";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useWatchElement } from "@/hooks/useWatchElement";
import { AbsPath } from "@/lib/paths2";
import { Workspace } from "@/workspace/Workspace";
import { useCurrentFilepath } from "@/workspace/WorkspaceContext";
import { MDXEditor, MDXEditorMethods } from "@mdxeditor/editor";
import graymatter from "gray-matter";
import { ComponentProps, useRef } from "react";

export function MarkdownEditor({ currentWorkspace, path }: { currentWorkspace: Workspace; path: AbsPath }) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const { mimeType } = useCurrentFilepath();
  const { lazyContents, hotContents, hotData, lazyContentsBody, updateImmediate, updateDebounce } = useFileContents({
    currentWorkspace,
    path,
    onLazyBodyContentsChange: editorRef.current?.setMarkdown,
  });
  const { DocHistory } = useDocHistory({
    markdownSync: hotContents,
    setEditorMarkdown: (md) => editorRef.current?.setMarkdown(graymatter(md).content),
    writeMarkdown: updateImmediate,
  });

  const mdxEditorElement = useWatchElement(MdxEditorScrollSelector);

  const handleChange = (md: string, initialMarkdownNormalize: boolean) => {
    if (!initialMarkdownNormalize) {
      const fullDoc = graymatter.stringify(md, hotData);
      void DocHistory.saveEdit(fullDoc);
      updateDebounce(fullDoc);
    }
  };

  if (lazyContents === null || !currentWorkspace) return null;

  return (
    <div className="flex flex-col h-full relative">
      <ScrollSync
        elementRef={{ current: mdxEditorElement as HTMLElement }}
        path={path}
        workspaceName={currentWorkspace.name}
      >
        <EditorWithPlugins
          mimeType={mimeType}
          currentWorkspace={currentWorkspace}
          editorRef={editorRef}
          onChange={handleChange}
          markdown={lazyContentsBody}
          className={"bg-background flex-grow flex-col h-full "}
          contentEditableClassName="max-w-full content-editable prose dark:prose-invert bg-background"
        />
      </ScrollSync>
    </div>
  );
}

function EditorWithPlugins({
  currentWorkspace,
  mimeType,
  editorRef,
  markdown,
  onChange,
  ...props
}: ComponentProps<typeof MDXEditor> & {
  currentWorkspace: Workspace;
  mimeType: string;
  editorRef: React.RefObject<MDXEditorMethods | null>;
}) {
  const plugins = useAllPlugins({
    currentWorkspace,
    realmId: MainEditorRealmId,
    mimeType: mimeType,
  });

  const { storedValue: spellCheck } = useLocalStorage("Editor/spellcheck", true);

  return (
    <MDXEditor
      {...props}
      plugins={plugins}
      ref={editorRef}
      trim={false}
      onChange={onChange}
      markdown={markdown}
      spellCheck={spellCheck}
    />
  );
}
