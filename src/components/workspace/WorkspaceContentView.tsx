import { useFileContents } from "@/context/useFileContents";
import { useAllPlugins } from "@/editor/AllPlugins";
import { MainEditorRealmId, MdxEditorScrollSelector } from "@/editor/EditorConst";
import { ScrollSync } from "@/features/live-preview/useScrollSync";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useWatchElement } from "@/hooks/useWatchElement";
import { stripFrontmatter } from "@/lib/markdown/frontMatter";
import { AbsPath } from "@/lib/paths2";
import { Workspace } from "@/workspace/Workspace";
import { useCurrentFilepath } from "@/workspace/WorkspaceContext";
import { MDXEditor, MDXEditorMethods } from "@mdxeditor/editor";
import { ComponentProps, useMemo, useRef } from "react";

export function WorkspaceMarkdownEditor({ currentWorkspace, path }: { currentWorkspace: Workspace; path: AbsPath }) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const { mimeType } = useCurrentFilepath();
  const mdxEditorElement = useWatchElement(MdxEditorScrollSelector);
  const { contents, updateDebounce } = useFileContents({
    currentWorkspace,
    path,
    onContentChange: (c) => {
      //outside edits
      editorRef.current?.setMarkdown(stripFrontmatter(c));
    },
  });
  const bodyOnly = useMemo(() => stripFrontmatter(contents || ""), [contents]);
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
          onChange={updateDebounce}
          markdown={bodyOnly}
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
      onChange={props.onChange}
      markdown={props.markdown}
      spellCheck={spellCheck}
    />
  );
}
