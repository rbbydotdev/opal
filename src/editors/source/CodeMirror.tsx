import { GitConflictNotice } from "@/components/GitConflictNotice";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EditHistoryMenu } from "@/editors/history/EditHistoryMenu";
import { useDocHistory } from "@/editors/history/HistoryPlugin";
import { LivePreviewButtons } from "@/editors/LivePreviewButton";
import { enhancedMarkdownExtension } from "@/editors/markdown/markdownHighlighting";
import { canPrettifyMime, prettifyMime } from "@/editors/prettifyMime";
import { customCodeMirrorTheme } from "@/editors/source/codeMirrorCustomTheme";
import { useURLRanges } from "@/editors/source/CodeMirrorSelectURLRangePlugin";
import { createCustomBasicSetup } from "@/editors/source/customBasicSetup";
import { gitConflictEnhancedPlugin } from "@/editors/source/gitConflictEnhancedPlugin";
import { useWatchViewMode } from "@/editors/view-mode/useWatchViewMode";
import { useResolvePathForPreview } from "@/features/live-preview/useResolvePathForPreview";
import { ScrollSync } from "@/features/live-preview/useScrollSync";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useWatchElement } from "@/hooks/useWatchElement";
import { useSidebarPanes } from "@/layouts/EditorSidebarLayout";
import { OpalMimeType } from "@/lib/fileType";
import { AbsPath } from "@/lib/paths2";
import { cn } from "@/lib/utils";
import { mustache } from "@/source-editor/mustacheLanguage";
import { SourceMimeType } from "@/source-editor/SourceMimeType";
import { Workspace } from "@/workspace/Workspace";
import { useCurrentFilepath, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { autocompletion } from "@codemirror/autocomplete";
import { indentWithTab } from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { Compartment, EditorSelection, EditorState, Extension, Transaction } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { vim } from "@replit/codemirror-vim";
import { useRouter } from "@tanstack/react-router";
import { ejs } from "codemirror-lang-ejs";
import { Check, ChevronLeftIcon, FileText, Sparkles, X } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";

const getLanguageExtension = (
  language:
    | "text/css"
    | "text/plain"
    | "text/markdown"
    | "text/javascript"
    | "text/x-ejs"
    | "text/x-mustache"
    | "text/html"
    | "application/json"
    | string
) => {
  switch (language) {
    case "text/css":
      return css();
    case "text/html":
      return html();
    case "text/markdown":
      return enhancedMarkdownExtension(true);
    case "text/javascript":
      return javascript();
    case "text/x-ejs":
      return ejs();
    case "text/x-mustache":
      return mustache();
    case "application/json":
      return json();
    case "text/plain":
    default:
      return null;
  }
};

const createValidatedSelection = (
  hasRanges: boolean,
  start: number | null | undefined,
  end: number | null | undefined,
  docLength?: number | undefined
): EditorSelection | undefined => {
  if (!hasRanges || start == null || end == null || docLength == null) return undefined;
  const validStart = Math.min(Math.max(0, start), docLength);
  const validEnd = Math.min(Math.max(0, end), docLength);
  return EditorSelection.create([EditorSelection.range(validStart, validEnd), EditorSelection.cursor(validStart)]);
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
}: {
  hasConflicts: boolean;
  mimeType: SourceMimeType;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  className?: string;
  currentWorkspace: Workspace;
  enableConflictResolution?: boolean;
}) => {
  const { storedValue: vimMode, setStoredValue: setVimMode } = useLocalStorage("CodeMirrorEditor/vimMode", false);
  const { storedValue: spellCheck, setStoredValue: setSpellCheck } = useLocalStorage("Editor/spellcheck", true);
  const { storedValue: globalConflictResolution, setStoredValue: setGlobalConflictResolution } = useLocalStorage(
    "SourceEditor/enableGitConflictResolution",
    true
  );

  const { path } = useWorkspaceRoute();
  const cmScroller = useWatchElement(".cm-scroller");

  const { start, end, hasRanges } = useURLRanges();

  const editorRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);

  const languageCompartment = useRef(new Compartment()).current;
  const vimCompartment = useRef(new Compartment()).current;
  const editableCompartment = useRef(new Compartment()).current;
  const conflictCompartment = useRef(new Compartment()).current;
  const basicSetupCompartment = useRef(new Compartment()).current;
  const spellCheckCompartment = useRef(new Compartment()).current;
  const updateCompartment = useRef(new Compartment()).current;

  const setEditorMarkdown = (md: string) => {
    if (viewRef.current && md !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: md,
        },
      });
    }
  };

  useEffect(() => {
    if (!editorRef.current) return;

    const extensions: Extension[] = [
      updateCompartment.of([]),
      autocompletion(),
      EditorView.lineWrapping,
      spellCheckCompartment.of(EditorView.contentAttributes.of({ spellcheck: spellCheck ? "true" : "false" })),
      keymap.of([indentWithTab]),

      // compartments (start with initial config)
      languageCompartment.of([]),
      vimCompartment.of([]),
      editableCompartment.of(EditorView.editable.of(false)),
      conflictCompartment.of([]),

      EditorView.theme({
        "&": { height: "100%" },
        ".cm-scroller": { height: "100%" },
        ".cm-content": { padding: 0 },
      }),
      basicSetupCompartment.of([]),
      customCodeMirrorTheme,
    ];

    const state = EditorState.create({
      doc: value,
      extensions,
      selection: createValidatedSelection(hasRanges, start, end, value.length),
    });

    viewRef.current = new EditorView({
      state,
      scrollTo:
        start !== null && end !== null ? EditorView.scrollIntoView(EditorSelection.range(start, end)) : undefined,
      parent: editorRef.current,
    });

    // Initialize compartments with actual values
    const view = viewRef.current;
    view.dispatch({
      effects: [
        languageCompartment.reconfigure(getLanguageExtension(mimeType) ?? []),
        editableCompartment.reconfigure(EditorView.editable.of(!readOnly)),
        conflictCompartment.reconfigure(hasConflicts ? gitConflictEnhancedPlugin(getLanguageExtension) : []),
      ],
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]); // Only depend on initial value or hash

  // Reconfigure language when mimeType/conflicts change
  useEffect(() => {
    if (viewRef.current) {
      const ext = hasConflicts
        ? [] // disable highlighting if conflicts enabled
        : (getLanguageExtension(mimeType) ?? []);
      viewRef.current.dispatch({
        effects: languageCompartment.reconfigure(ext),
      });
    }
  }, [mimeType, hasConflicts, value, globalConflictResolution, languageCompartment]);
  useEffect(() => {
    //basicsetup compartment - use custom setup that respects vim mode
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: basicSetupCompartment.reconfigure(createCustomBasicSetup(vimMode)),
      });
    }
  }, [basicSetupCompartment, value, vimMode]);

  // Reconfigure vim mode
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: vimCompartment.reconfigure(vimMode ? vim() : []),
      });
    }
  }, [vimCompartment, value, vimMode]);

  // Reconfigure editable state
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: editableCompartment.reconfigure(EditorView.editable.of(!readOnly)),
      });
    }
  }, [editableCompartment, value, readOnly]);

  // Reconfigure conflict plugin
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: conflictCompartment.reconfigure(
          enableConflictResolution ? gitConflictEnhancedPlugin(getLanguageExtension) : []
        ),
      });
    }
  }, [conflictCompartment, value, enableConflictResolution]);

  // Reconfigure spellcheck
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: spellCheckCompartment.reconfigure(
          EditorView.contentAttributes.of({ spellcheck: spellCheck ? "true" : "false" })
        ),
      });
    }
  }, [spellCheckCompartment, spellCheck]);

  // external prop value pushes into editor
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

  useEffect(() => {
    if (hasRanges && viewRef.current) {
      viewRef.current.dispatch({
        selection: createValidatedSelection(hasRanges, start, end, viewRef.current.state.doc.length),
        scrollIntoView: true, // optional if you want to scroll focus to the selection
      });
    }
  }, [end, hasRanges, start]);

  const { DocHistory } = useDocHistory({
    markdownSync: value,
    setEditorMarkdown,
  });

  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      effects: updateCompartment.reconfigure([
        EditorView.updateListener.of((update) => {
          for (const tr of update.transactions) {
            const userEvent = tr.annotation(Transaction.userEvent);
            if (userEvent && ["input", "delete", "undo", "redo"].some((prefix) => userEvent.includes(prefix))) {
              const newDoc = update.state.doc.toString();
              void DocHistory.saveEdit(newDoc, value);
              onChange(newDoc);
            }
          }
        }),
      ]),
    });
  }, [DocHistory, onChange, updateCompartment, value]);

  return (
    <>
      <ScrollSync
        elementRef={{ current: cmScroller as HTMLElement }}
        path={path!}
        workspaceName={currentWorkspace.name}
      >
        <CodeMirrorToolbar
          key={path}
          setVimMode={setVimMode}
          // editorMarkdown={editorMarkdown}
          // setEditorMarkdown={setEditorMarkdown}
          vimMode={vimMode}
          spellCheck={spellCheck}
          setSpellCheck={setSpellCheck}
          currentWorkspace={currentWorkspace}
          path={path}
          conflictResolution={globalConflictResolution}
          setConflictResolution={setGlobalConflictResolution}
          hasConflicts={hasConflicts}
          mimeType={mimeType}
          editorView={viewRef.current}
        />
        <div className={cn("code-mirror-source-editor bg-background min-h-0", className)} ref={editorRef} />
      </ScrollSync>
    </>
  );
};

const RichButton = memo(({ onClick }: { onClick: () => void }) => (
  <Button variant="outline" size="sm" onClick={onClick}>
    <span className="text-xs flex justify-center items-center gap-1">
      <ChevronLeftIcon size={12} />
      <FileText size={12} /> Rich Text
    </span>
  </Button>
));

const CodeMirrorToolbar = memo(
  ({
    children,
    path,
    currentWorkspace,
    vimMode,
    setVimMode,
    spellCheck,
    setSpellCheck,
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
    spellCheck: boolean;
    setSpellCheck: (value: boolean) => void;
    conflictResolution?: boolean;
    setConflictResolution?: (value: boolean) => void;
    hasConflicts?: boolean;
    mimeType?: OpalMimeType;
    editorView?: EditorView | null;
  }) => {
    const { isMarkdown, hasEditOverride, isHtml, isSourceView, isCssFile } = useCurrentFilepath();

    const { left } = useSidebarPanes();
    const { choicePreviewNode: previewNode } = useResolvePathForPreview({ path, currentWorkspace });
    const router = useRouter();
    const [, setViewMode] = useWatchViewMode();

    const handlePrettify = useCallback(async () => {
      if (!editorView || !mimeType) return;
      try {
        const currentContent = editorView.state.doc.toString();
        editorView.dispatch({
          changes: {
            from: 0,
            to: editorView.state.doc.length,
            insert: await prettifyMime(mimeType, currentContent),
          },
        });
      } catch (error) {
        console.error("Prettify failed:", error);
      }
    }, [editorView, mimeType]);

    const canPrettify = useMemo(() => canPrettifyMime(mimeType) && !hasConflicts, [mimeType, hasConflicts]);

    const handleRichTextMode = useCallback(() => setViewMode("rich-text"), [setViewMode]);

    const handleNavigateToPreview = useCallback(() => {
      if (!previewNode) return;
      void router.navigate({
        to: currentWorkspace.resolveFileUrl(previewNode.path),
      });
    }, [router, currentWorkspace, previewNode]);

    const handleToggleConflictResolution = useCallback(() => {
      setConflictResolution?.(!conflictResolution);
    }, [setConflictResolution, conflictResolution]);

    const handleSpellCheckChange = useCallback(
      (checked: boolean) => {
        setSpellCheck(checked);
      },
      [setSpellCheck]
    );

    const handleVimModeChange = useCallback(
      (checked: boolean) => {
        setVimMode(checked);
      },
      [setVimMode]
    );

    return (
      <div
        className={cn("flex items-center justify-start p-2 bg-card h-12 gap-2", {
          "pl-10": !left.isCollapsed,
          "pl-16": left.isCollapsed,
        })}
      >
        {!hasEditOverride && (
          <>
            {isMarkdown && !hasConflicts && isSourceView && <RichButton onClick={handleRichTextMode} />}
            {!isMarkdown && previewNode?.isMarkdownFile() && <RichButton onClick={handleNavigateToPreview} />}
            {(isMarkdown || isCssFile || isHtml) && <LivePreviewButtons />}

            {canPrettify && (
              <Button variant="outline" size="sm" onClick={handlePrettify}>
                <span className="text-xs flex justify-center items-center gap-1">
                  <Sparkles size={12} />
                  Prettify
                </span>
              </Button>
            )}
          </>
        )}

        <EditHistoryMenu />
        {hasConflicts && isMarkdown && <GitConflictNotice />}
        <div className="ml-auto flex items-center gap-4">
          {setConflictResolution && hasConflicts && (
            <Button
              variant={conflictResolution ? "default" : "outline"}
              size="sm"
              onClick={handleToggleConflictResolution}
              aria-pressed={conflictResolution}
              aria-label="Toggle git conflict resolution"
            >
              <Check strokeWidth={4} className={cn("mr-1 h-4 w-4", !conflictResolution && "hidden")} />
              <X strokeWidth={4} className={cn("mr-1 h-4 w-4", conflictResolution && "hidden")} />
              Git Conflicts Editor
            </Button>
          )}

          <Label htmlFor="spellCheck" className="p-2 border bg-accent rounded flex items-center gap-1 select-none">
            <span className="text-sm whitespace-nowrap truncate">Spellcheck</span>
            <Switch
              id="spellCheck"
              className="ml-1"
              checked={spellCheck}
              onCheckedChange={handleSpellCheckChange}
              aria-label="Enable spellcheck"
            />
          </Label>

          <Label htmlFor="vimMode" className="p-2 border bg-accent rounded flex items-center gap-1 select-none">
            <span className="text-sm whitespace-nowrap truncate">Vim Mode</span>
            <Switch
              id="vimMode"
              className="ml-1"
              checked={vimMode}
              onCheckedChange={handleVimModeChange}
              aria-label="Enable Vim mode"
            />
          </Label>
        </div>
        {children}
      </div>
    );
  }
);
