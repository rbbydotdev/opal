// import { markdownWithFrontMatter } from "@/components/SourceEditor/markdowExt";
import {
  CodeMirrorHighlightURLRange,
  getHighlightRangesFromURL,
} from "@/components/Editor/CodeMirrorSelectURLRangePlugin";
import { EditHistoryMenu } from "@/components/Editor/history/EditHistoryMenu";
import { useEditorHistoryPlugin2WithContentWatch } from "@/components/Editor/history/useEditorHistoryPlugin2WithContentWatch";
import { setViewMode } from "@/components/Editor/view-mode/handleUrlParamViewMode";
import { Button } from "@/components/ui/button";
import { useFileContents } from "@/context/useFileContents";
import { useCurrentFilepath } from "@/context/WorkspaceHooks";
import { useSnapHistoryDB } from "@/Db/HistoryDAO";
import { Workspace } from "@/Db/Workspace";
import { cn } from "@/lib/utils";
import { autocompletion } from "@codemirror/autocomplete";
import { indentWithTab } from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { yamlFrontmatter } from "@codemirror/lang-yaml";
import { languages } from "@codemirror/language-data";
import { EditorState, Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicLight } from "cm6-theme-basic-light";
import { basicSetup } from "codemirror";
import { ChevronLeftIcon, FileText } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

export type StrictSourceMimesType = "text/css" | "text/plain" | "text/markdown" | "text/javascript";

const getLanguageExtension = (language: "text/css" | "text/plain" | "text/markdown" | "text/javascript" | string) => {
  switch (language) {
    case "text/css":
      return css();
    case "text/markdown":
      return yamlFrontmatter({
        content: markdown({
          base: markdownLanguage,
          codeLanguages: languages,
        }),
      });
    case "text/javascript":
      return javascript();
    case "text/plain":
    default:
      return null;
  }
};

export const CodeMirrorEditor = ({
  mimeType,
  value,
  onChange,
  readOnly = false,
  height = "200px",
  className,
  currentWorkspace,
}: {
  mimeType: "text/css" | "text/plain" | "text/markdown" | string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
  className?: string;
  currentWorkspace: Workspace;
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const ext = useMemo(() => getLanguageExtension(mimeType), [mimeType]);

  useEffect(() => {
    if (!editorRef.current) return;

    // Clean up previous view
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const extensions: Extension[] = [
      basicSetup,
      basicLight,
      autocompletion(), // enables autocomplete
      EditorView.lineWrapping,

      CodeMirrorHighlightURLRange(getHighlightRangesFromURL(window.location.href, "hash")),
      keymap.of([indentWithTab]),
      ext,
      EditorView.updateListener.of((update) => {
        if (update.docChanged && onChange) {
          onChange(update.state.doc.toString());
        }
      }),
      EditorView.editable.of(!readOnly),
      EditorView.theme(
        {
          "&": { height: "100%" }, // Make the editor fill its parent
          ".cm-scroller": { height: "100%" }, // Make the scroll area fill the editor
          ".cm-content": {
            padding: 0,
          },
        },
        {
          dark: false,
        }
      ),
    ].filter(Boolean) as Extension[];

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
    // Only run on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorRef, readOnly, height]);

  // Update content if value prop changes
  useEffect(() => {
    if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value,
        },
      });
    }
  }, [value]);

  const { updateDebounce } = useFileContents({ currentWorkspace });

  const historyDB = useSnapHistoryDB();

  const {
    triggerSave,
    isRestoreState,
    edits,
    selectedEdit,
    selectedEditMd,
    setEdit,
    clearAll,
    rebaseHistory,
    resetAndRestore,
  } = useEditorHistoryPlugin2WithContentWatch({
    workspaceId: currentWorkspace.id,
    historyStorage: historyDB,
  });

  return (
    <>
      <CodeMirrorToolbar>
        <EditHistoryMenu
          finalizeRestore={(md) => updateDebounce(md)}
          disabled={mimeType !== "text/markdown"}
          edits={edits}
          selectedEdit={selectedEdit}
          setEdit={setEdit}
          rebaseHistory={rebaseHistory}
          resetAndRestore={resetAndRestore}
          clearAll={clearAll}
          triggerSave={triggerSave}
          isRestoreState={isRestoreState}
          selectedEditMd={selectedEditMd}
        />
      </CodeMirrorToolbar>
      <div className={cn("code-mirror-source-editor bg-background h-full", className)} ref={editorRef} />
    </>
  );
};

const CodeMirrorToolbar = ({ children }: { children?: React.ReactNode }) => {
  const { isMarkdown } = useCurrentFilepath();
  return (
    <div className="flex items-center justify-start p-2 bg-muted h-12">
      {isMarkdown && (
        <Button variant="outline" size="sm" onClick={() => setViewMode("rich-text", "hash+search")}>
          <span className="text-xs flex justify-center items-center gap-1">
            <ChevronLeftIcon size={12} />
            <FileText size={12} /> Rich Text
          </span>
        </Button>
      )}
      {children}
    </div>
  );
};
