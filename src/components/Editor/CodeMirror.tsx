// import { markdownWithFrontMatter } from "@/components/SourceEditor/markdowExt";
import {
  CodeMirrorHighlightURLRange,
  getHighlightRangesFromURL,
} from "@/components/Editor/CodeMirrorSelectURLRangePlugin";
import { EditHistoryMenu } from "@/components/Editor/history/EditHistoryMenu";
import { useEditorHistoryPlugin2WithContentWatch } from "@/components/Editor/history/useEditorHistoryPlugin2WithContentWatch";
import { setViewMode } from "@/components/Editor/view-mode/handleUrlParamViewMode";
import { ScrollSyncProvider, useWorkspacePathScrollChannel } from "@/components/ScrollSync";
import { Button } from "@/components/ui/button";
import { useFileContents } from "@/context/useFileContents";
import { useCurrentFilepath } from "@/context/WorkspaceContext";
import { useSnapHistoryDB } from "@/Db/HistoryDAO";
import { Workspace } from "@/Db/Workspace";
import { useWatchElement } from "@/hooks/useWatchElement";
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

const noCommentKeymap = keymap.of([
  { key: "Mod-/", run: () => true }, // return true = handled, but do nothing
]);
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
  onChange: (value: string) => void;
  readOnly?: boolean;
  height?: string;
  className?: string;
  currentWorkspace: Workspace;
}) => {
  const valueRef = useRef(value);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const ext = useMemo(() => getLanguageExtension(mimeType), [mimeType]);

  valueRef.current = value;
  // Mount editor once
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
      autocompletion(),
      EditorView.lineWrapping,
      CodeMirrorHighlightURLRange(getHighlightRangesFromURL(window.location.href, "hash")),
      noCommentKeymap,
      keymap.of([indentWithTab]),
      ext,
      // how to determine user change vs programmatic change
      // EditorView.updateListener.of((update) => {
      //         if (update.docChanged) {
      //           // Check if this was a user event
      //           const userEvent = update.transactions.some((tr) =>
      //             tr.annotation(Transaction.userEvent)
      //           );

      //           if (userEvent) {
      //             console.log("User change:", userEvent);
      //             // userEvent will be strings like "input", "delete", "paste", "dragdrop"
      //           } else {
      //             console.log("Programmatic change");
      //           }
      //         }
      //       }),

      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const docStr = update.state.doc.toString();
          // const prevStr = update.startState.doc.toString();
          // if (docStr !== prevStr && onChange) {
          if (docStr !== valueRef.current) {
            onChange(docStr);
          }
        }
      }),
      EditorView.editable.of(!readOnly),
      EditorView.theme(
        {
          "&": { height: "100%" },
          ".cm-scroller": { height: "100%" },
          ".cm-content": { padding: 0 },
        },
        { dark: false }
      ),
    ].filter(Boolean) as Extension[];

    const state = EditorState.create({
      doc: valueRef.current, // controlled value at mount
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
  }, [editorRef, readOnly, height, ext, value, onChange]);

  // Sync external value → editor

  useEffect(() => {
    if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: { from: 0, to: viewRef.current.state.doc.length, insert: value },
      });
    }
  }, [value]);

  // history + toolbar stuff
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

  const { scrollEmitter, sessionId } = useWorkspacePathScrollChannel();
  const cmScroller = useWatchElement(".cm-scroller");
  return (
    <>
      <ScrollSyncProvider scrollEl={cmScroller as HTMLElement} scrollEmitter={scrollEmitter} sessionId={sessionId}>
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
      </ScrollSyncProvider>
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
