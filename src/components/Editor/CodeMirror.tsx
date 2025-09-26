import { customCodeMirrorTheme } from "@/components/Editor/codeMirrorCustomTheme";
import {
  CodeMirrorHighlightURLRange,
  getHighlightRangesFromURL,
} from "@/components/Editor/CodeMirrorSelectURLRangePlugin";
import { gitConflictEnhancedPlugin } from "@/components/Editor/gitConflictEnhancedPlugin";
import { LivePreviewButtons } from "@/components/Editor/LivePreviewButton";
import { enhancedMarkdownExtension } from "@/components/Editor/markdownHighlighting";
import { setViewMode } from "@/components/Editor/view-mode/handleUrlParamViewMode";
import { GitConflictNotice } from "@/components/GitConflictNotice";
import { ScrollSyncProvider, useWorkspacePathScrollChannel } from "@/components/ScrollSync";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCurrentFilepath, useWorkspaceRoute } from "@/context/WorkspaceContext";
import { Workspace } from "@/Db/Workspace";
import useLocalStorage2 from "@/hooks/useLocalStorage2";
import { useWatchElement } from "@/hooks/useWatchElement";
import { AbsPath } from "@/lib/paths2";
import { useResolvePathForPreview } from "@/lib/useResolvePathForPreview";
import { cn } from "@/lib/utils";
import { autocompletion } from "@codemirror/autocomplete";
import { indentWithTab } from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { EditorState, Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { vim } from "@replit/codemirror-vim";
import { useRouter } from "@tanstack/react-router";
import { basicSetup } from "codemirror";
import { ejs } from "codemirror-lang-ejs";
import { Check, ChevronLeftIcon, FileText, Sparkles, X } from "lucide-react";
import parserBabel from "prettier/plugins/babel";
import parserEstree from "prettier/plugins/estree";
import parserHtml from "prettier/plugins/html";
import parserMarkdown from "prettier/plugins/markdown";
import parserPostcss from "prettier/plugins/postcss";
import * as prettier from "prettier/standalone";
import { useEffect, useMemo, useRef } from "react";

const noCommentKeymap = keymap.of([{ key: "Mod-/", run: () => true }]);
export type StrictSourceMimesType = "text/css" | "text/plain" | "text/markdown" | "text/javascript" | "text/x-ejs";

const getLanguageExtension = (
  language: "text/css" | "text/plain" | "text/markdown" | "text/javascript" | "text/x-ejs" | string
) => {
  switch (language) {
    case "text/css":
      return css();
    case "text/markdown":
      return enhancedMarkdownExtension(true);
    case "text/javascript":
      return javascript();
    case "text/x-ejs":
      return ejs();
    case "text/plain":
    default:
      return null;
  }
};

export const CodeMirrorEditor = ({
  hasConflicts,
  mimeType,
  value,
  onChange,
  readOnly = false,
  className,
  currentWorkspace,
  enableConflictResolution = true,
  // onConflictStatusChange,
}: {
  hasConflicts: boolean;
  mimeType: "text/css" | "text/plain" | "text/markdown" | "text/x-ejs" | string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  className?: string;
  currentWorkspace: Workspace;
  enableConflictResolution?: boolean;
}) => {
  const { storedValue: vimMode, setStoredValue: setVimMode } = useLocalStorage2("CodeMirrorEditor/vimMode", false);
  const { storedValue: globalConflictResolution, setStoredValue: setGlobalConflictResolution } = useLocalStorage2(
    "SourceEditor/enableGitConflictResolution",
    true
  );
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;
  const editorRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const ext = useMemo(() => getLanguageExtension(mimeType), [mimeType]);
  const conflictResolutionEnabled = enableConflictResolution ?? globalConflictResolution;
  const shouldDisableLanguageExtension = conflictResolutionEnabled && hasConflicts;

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
      shouldDisableLanguageExtension ? null : ext,
      conflictResolutionEnabled ? gitConflictEnhancedPlugin(getLanguageExtension) : null,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const docStr = update.state.doc.toString();
          if (docStr !== valueRef.current) {
            valueRef.current = docStr;
            onChangeRef.current(docStr);
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
  }, [conflictResolutionEnabled, ext, readOnly, shouldDisableLanguageExtension, vimMode]);

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
          key={path}
          setVimMode={setVimMode}
          vimMode={vimMode}
          currentWorkspace={currentWorkspace}
          path={path}
          conflictResolution={globalConflictResolution}
          setConflictResolution={setGlobalConflictResolution}
          hasConflicts={hasConflicts}
          mimeType={mimeType}
          editorView={viewRef.current}
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
  conflictResolution = true,
  setConflictResolution,
  hasConflicts = false,
  mimeType,
  editorView,
}: {
  children?: React.ReactNode;
  path: AbsPath | null;
  currentWorkspace: Workspace;
  vimMode: boolean;
  setVimMode: (value: boolean) => void;
  conflictResolution?: boolean;
  setConflictResolution?: (value: boolean) => void;
  hasConflicts?: boolean;
  mimeType?: string;
  editorView?: EditorView | null;
}) => {
  const { isMarkdown, hasEditOverride } = useCurrentFilepath();
  const previewNode = useResolvePathForPreview({ path, currentWorkspace });
  const router = useRouter();

  const handlePrettify = async () => {
    if (!editorView || !mimeType) return;

    try {
      const currentContent = editorView.state.doc.toString();
      let prettifiedContent: string;

      switch (mimeType) {
        case "text/css":
          prettifiedContent = await prettier.format(currentContent, {
            parser: "css",
            plugins: [parserBabel, parserPostcss],
          });
          break;
        case "text/javascript":
          prettifiedContent = await prettier.format(currentContent, {
            parser: "babel",
            plugins: [parserBabel, parserEstree],
          });
          break;
        case "text/markdown":
          prettifiedContent = await prettier.format(currentContent, {
            parser: "markdown",
            plugins: [parserMarkdown],
          });
          break;
        case "text/x-ejs":
          prettifiedContent = await prettier.format(currentContent, {
            parser: "html",
            plugins: [parserHtml],
          });
          break;
        default:
          return;
      }

      editorView.dispatch({
        changes: { from: 0, to: editorView.state.doc.length, insert: prettifiedContent },
      });
    } catch (error) {
      console.error("Prettify failed:", error);
    }
  };

  const canPrettify = mimeType && ["text/css", "text/javascript", "text/markdown", "text/x-ejs"].includes(mimeType);

  return (
    <div className="pl-10 flex items-center justify-start p-2 bg-muted h-12 gap-2">
      {isMarkdown && !hasConflicts && !hasEditOverride && (
        <SourceButton onClick={() => setViewMode("rich-text", "hash+search")} />
      )}
      {!isMarkdown && previewNode?.isMarkdownFile() && !hasEditOverride && (
        <SourceButton onClick={() => router.navigate({ to: currentWorkspace.resolveFileUrl(previewNode.path) })} />
      )}
      {!hasEditOverride && <LivePreviewButtons />}
      {canPrettify && !hasEditOverride && (
        <Button variant="outline" size="sm" onClick={handlePrettify}>
          <span className="text-xs flex justify-center items-center gap-1">
            <Sparkles size={12} />
            Prettify
          </span>
        </Button>
      )}
      {hasConflicts && isMarkdown && <GitConflictNotice />}
      <div className="ml-auto flex items-center gap-4">
        {/* Git conflict resolution toggle - only show when conflicts exist */}
        {setConflictResolution && hasConflicts && (
          <Button
            variant={conflictResolution ? "default" : "outline"}
            size="sm"
            onClick={() => setConflictResolution?.(!conflictResolution)}
            aria-pressed={conflictResolution}
            aria-label="Toggle git conflict resolution"
          >
            <Check strokeWidth={4} className={cn("mr-1 h-4 w-4", !conflictResolution && "hidden")} />
            <X strokeWidth={4} className={cn("mr-1 h-4 w-4", conflictResolution && "hidden")} />
            Git Conflicts Editor
          </Button>
        )}

        {/* Vim mode toggle */}
        <Label htmlFor="vimMode" className="flex items-center gap-1 select-none">
          <span className="text-sm">Vim Mode</span>
          <input
            id="vimMode"
            type="checkbox"
            className="ml-1"
            checked={vimMode}
            onChange={(e) => setVimMode(e.target.checked)}
            aria-label="Enable Vim mode"
          />
        </Label>
      </div>
      {children}
    </div>
  );
};
