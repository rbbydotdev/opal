import { customCodeMirrorTheme } from "@/components/Editor/codeMirrorCustomTheme";
import {
  CodeMirrorHighlightURLRange,
  getHighlightRangesFromURL,
} from "@/components/Editor/CodeMirrorSelectURLRangePlugin";
import { LivePreviewButtons } from "@/components/Editor/LivePreviewButton";
import { enhancedMarkdownExtension } from "@/components/Editor/markdownHighlighting";
import { setViewMode } from "@/components/Editor/view-mode/handleUrlParamViewMode";
import { ScrollSyncProvider, useWorkspacePathScrollChannel } from "@/components/ScrollSync";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCurrentFilepath, useWorkspaceRoute } from "@/context/WorkspaceContext";
import { Workspace } from "@/Db/Workspace";
import useLocalStorage2 from "@/hooks/useLocalStorage2";
import { useWatchElement } from "@/hooks/useWatchElement";
import { useThemeSettings } from "@/layouts/ThemeProvider";
import { AbsPath } from "@/lib/paths2";
import { useResolvePathForPreview } from "@/lib/useResolvePathForPreview";
import { cn } from "@/lib/utils";
import { autocompletion } from "@codemirror/autocomplete";
import { indentWithTab } from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
// import { unifiedMergeView } from "@codemirror/merge";
import { EditorState, Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { vim } from "@replit/codemirror-vim";
import { useRouter } from "@tanstack/react-router";
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
      return enhancedMarkdownExtension(true);
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
  const { storedValue: vimMode, setStoredValue: setVimMode } = useLocalStorage2("CodeMirrorEditor/vimMode", false);
  const valueRef = useRef(value);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const ext = useMemo(() => getLanguageExtension(mimeType), [mimeType]);
  const { mode } = useThemeSettings();
  useEffect(() => {
    if (!editorRef.current) return;
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const extensions: Extension[] = [
      vimMode ? vim() : null,
      basicSetup,
      customCodeMirrorTheme,
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
          if (docStr !== valueRef.current) {
            valueRef.current = docStr;
            onChange(docStr);
          }
        }
      }),
      EditorView.editable.of(!readOnly),
      EditorView.theme({
        "&": { height: "calc(100% - 4rem)" },
        ".cm-scroller": { height: "100%" },
        ".cm-content": { padding: 0 },
      }),
    ].filter(Boolean) as Extension[];

    const state = EditorState.create({
      doc: valueRef.current,
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
  }, [editorRef, readOnly, height, ext, value, onChange, mode, vimMode]);

  useEffect(() => {
    if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: { from: 0, to: viewRef.current.state.doc.length, insert: value },
      });
    }
  }, [value]);

  const { path } = useWorkspaceRoute();

  const { scrollEmitter, sessionId } = useWorkspacePathScrollChannel();
  const cmScroller = useWatchElement(".cm-scroller");
  return (
    <>
      <ScrollSyncProvider scrollEl={cmScroller as HTMLElement} scrollEmitter={scrollEmitter} sessionId={sessionId}>
        <CodeMirrorToolbar
          setVimMode={setVimMode}
          vimMode={vimMode}
          currentWorkspace={currentWorkspace}
          path={path}
        ></CodeMirrorToolbar>
        <div className={cn("code-mirror-source-editor bg-background h-full", className)} ref={editorRef} />
      </ScrollSyncProvider>
    </>
  );
};

const SourceButton = ({ onClick }: { onClick: () => void }) => (
  <Button variant="outline" size="sm" onClick={onClick}>
    <span className="text-xs flex justify-center items-center gap-1">
      <ChevronLeftIcon size={12} />
      <FileText size={12} /> Rich Text
    </span>
  </Button>
);
const CodeMirrorToolbar = ({
  children,
  path,
  currentWorkspace,
  vimMode,
  setVimMode,
}: {
  children?: React.ReactNode;
  path: AbsPath | null;
  currentWorkspace: Workspace;
  vimMode: boolean;
  setVimMode: (value: boolean) => void;
}) => {
  const { isMarkdown } = useCurrentFilepath();
  const previewNode = useResolvePathForPreview({ path, currentWorkspace });
  const router = useRouter();
  return (
    <div className="flex items-center justify-start p-2 bg-muted h-12 gap-2">
      {isMarkdown && <SourceButton onClick={() => setViewMode("rich-text", "hash+search")} />}
      {!isMarkdown && previewNode?.isMarkdownFile() && (
        <SourceButton onClick={() => router.navigate({ to: currentWorkspace.resolveFileUrl(previewNode.path) })} />
      )}

      <LivePreviewButtons />
      <Label htmlFor="vimMode" className="ml-auto flex items-center gap-1 select-none">
        <span className="text-sm">Vim Mode</span>
      </Label>
      <input
        id="vimMode"
        type="checkbox"
        className="ml-1"
        checked={vimMode}
        onChange={(e) => setVimMode(e.target.checked)}
        aria-label="Enable Vim mode"
      />
      {children}
    </div>
  );
};
