import { useFileContents } from "@/data/useFileContents";
import { useAllPlugins } from "@/editor/AllPlugins";
import { MainEditorRealmId, MdxEditorScrollSelector } from "@/editor/EditorConst";
import { useDocHistory } from "@/editor/history/HistoryPlugin";
import { ScrollSync } from "@/features/live-preview/useScrollSync";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useWatchElement } from "@/hooks/useWatchElement";
import { AbsPath } from "@/lib/paths2";
import { Workspace } from "@/workspace/Workspace";
import { useCurrentFilepath } from "@/workspace/WorkspaceContext";
import { MDXEditor, MDXEditorMethods } from "@mdxeditor/editor";
import { ComponentProps, useRef } from "react";

export function WorkspaceMarkdownEditor({ currentWorkspace, path }: { currentWorkspace: Workspace; path: AbsPath }) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const { mimeType } = useCurrentFilepath();
  const { contents, hotContents, contentsBody, updateImmediate, updateDebounce } = useFileContents({
    currentWorkspace,
    path,
  });
  const { DocHistory } = useDocHistory({
    editorMarkdown: hotContents,
    setEditorMarkdown: editorRef.current?.setMarkdown,
    writeMarkdown: updateImmediate,
  });
  const mdxEditorElement = useWatchElement(MdxEditorScrollSelector);

  const handleChange = (md: string, initialMarkdownNormalize: boolean) => {
    if (!initialMarkdownNormalize) {
      void DocHistory.saveEdit(md);
      updateDebounce(md);
    }
  };

  if (contents === null || !currentWorkspace) return null;

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
          markdown={contentsBody}
          className={"bg-background flex-grow flex-col h-full "}
          contentEditableClassName="max-w-full content-editable prose dark:prose-invert bg-background"
        />
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

  const { storedValue: spellCheck } = useLocalStorage("Editor/spellcheck", true);

  return (
    <MDXEditor
      {...props}
      plugins={plugins}
      ref={props.editorRef}
      trim={false}
      onChange={(markdown: string, initialMarkdownNormalize: boolean) => {
        props.onChange?.(markdown, initialMarkdownNormalize);
      }}
      markdown={props.markdown}
      spellCheck={spellCheck}
    />
  );
}
