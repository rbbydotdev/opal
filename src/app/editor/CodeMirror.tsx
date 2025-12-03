import { customCodeMirrorTheme } from "@/app/editor/codeMirrorCustomTheme";
import { useHashURLRanges } from "@/app/editor/CodeMirrorSelectURLRangePlugin";
import { createCustomBasicSetup } from "@/app/editor/customBasicSetup";
import { gitConflictEnhancedPlugin } from "@/app/editor/gitConflictEnhancedPlugin";
import { LivePreviewButtons } from "@/app/editor/LivePreviewButton";
import { enhancedMarkdownExtension } from "@/app/editor/markdownHighlighting";
import { canPrettifyMime, prettifyMime } from "@/app/editor/prettifyMime";
import { setViewMode } from "@/app/editor/view-mode/handleUrlParamViewMode";
import { GitConflictNotice } from "@/components/GitConflictNotice";
import { SourceMimeType } from "@/components/SourceEditor/SourceMimeType";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCurrentFilepath, useWorkspaceRoute } from "@/context/WorkspaceContext";
import { useSidebarPanes } from "@/features/preview-pane/EditorSidebarLayout";
import { useResolvePathForPreview } from "@/features/preview-pane/useResolvePathForPreview";
import useLocalStorage2 from "@/hooks/useLocalStorage2";
import { useWatchElement } from "@/hooks/useWatchElement";
import { mustache } from "@/lib/codemirror/mustacheLanguage";
import { OpalMimeType } from "@/lib/fileType";
import { AbsPath } from "@/lib/paths2";
import { ScrollSync } from "@/lib/useScrollSync";
import { cn } from "@/lib/utils";
import { Workspace } from "@/workspace/Workspace";
import { autocompletion } from "@codemirror/autocomplete";
import { indentWithTab } from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { Compartment, EditorSelection, EditorState, Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { vim } from "@replit/codemirror-vim";
import { useRouter } from "@tanstack/react-router";
import { ejs } from "codemirror-lang-ejs";
import { Check, ChevronLeftIcon, FileText, Sparkles, X } from "lucide-react";
import { useEffect, useRef } from "react";

type StrictSourceMimesType =
  | "text/css"
  | "text/plain"
  | "text/markdown"
  | "text/javascript"
  | "text/x-ejs"
  | "text/x-mustache"
  | "text/html"
  | "application/json";

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
  const { storedValue: vimMode, setStoredValue: setVimMode } = useLocalStorage2("CodeMirrorEditor/vimMode", false);
  const { storedValue: globalConflictResolution, setStoredValue: setGlobalConflictResolution } = useLocalStorage2(
    "SourceEditor/enableGitConflictResolution",
    true
  );
  const { start, end, hasRanges } = useHashURLRanges();

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const editorRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Compartments for dynamic configuration
  const languageCompartment = useRef(new Compartment()).current;
  const vimCompartment = useRef(new Compartment()).current;
  const editableCompartment = useRef(new Compartment()).current;
  const conflictCompartment = useRef(new Compartment()).current;
  const basicSetupCompartment = useRef(new Compartment()).current;

  // const [start, end] = parseParamsToRanges(new URLSearchParams(location.hash)).ranges?.at(0) ?? [null, null];

  // initial setup
  useEffect(() => {
    if (!editorRef.current) return;

    const extensions: Extension[] = [
      autocompletion(),
      EditorView.lineWrapping,
      keymap.of([indentWithTab]),

      // compartments (start with initial config)
      languageCompartment.of([]),
      vimCompartment.of([]),
      editableCompartment.of(EditorView.editable.of(false)),
      conflictCompartment.of([]),

      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const docStr = update.state.doc.toString();
          onChangeRef.current(docStr);
        }
      }),

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
      selection: hasRanges
        ? EditorSelection.create([EditorSelection.range(start, end), EditorSelection.cursor(start)])
        : undefined,
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
        conflictCompartment.reconfigure(
          enableConflictResolution && hasConflicts ? gitConflictEnhancedPlugin(getLanguageExtension) : []
        ),
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
      const ext =
        hasConflicts && globalConflictResolution
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

  const { path } = useWorkspaceRoute();

  const cmScroller = useWatchElement(".cm-scroller");

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
          vimMode={vimMode}
          currentWorkspace={currentWorkspace}
          path={path}
          conflictResolution={globalConflictResolution}
          setConflictResolution={setGlobalConflictResolution}
          hasConflicts={hasConflicts}
          mimeType={mimeType}
          editorView={viewRef.current}
        ></CodeMirrorToolbar>
        <div className={cn("code-mirror-source-editor bg-background min-h-0", className)} ref={editorRef} />
      </ScrollSync>
    </>
  );
};

const RichButton = ({ onClick }: { onClick: () => void }) => (
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
  mimeType?: OpalMimeType;
  editorView?: EditorView | null;
}) => {
  const { isMarkdown, hasEditOverride, isHtml, isSourceView, isCssFile } = useCurrentFilepath();

  const { left } = useSidebarPanes();
  const { previewNode } = useResolvePathForPreview({ path, currentWorkspace });
  const router = useRouter();

  const handlePrettify = async () => {
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
  };

  const canPrettify = canPrettifyMime(mimeType);

  return (
    <div
      className={cn("flex items-center justify-start p-2 bg-card h-12 gap-2", {
        "pl-10": !left.isCollapsed,
        "pl-16": left.isCollapsed,
      })}
    >
      {!hasEditOverride && (
        <>
          {isMarkdown && !hasConflicts && isSourceView && (
            <RichButton onClick={() => setViewMode("rich-text", "hash+search")} />
          )}
          {!isMarkdown && previewNode?.isMarkdownFile() && (
            <RichButton
              onClick={() =>
                router.navigate({
                  to: currentWorkspace.resolveFileUrl(previewNode.path),
                })
              }
            />
          )}
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
      {hasConflicts && isMarkdown && <GitConflictNotice />}
      <div className="ml-auto flex items-center gap-4">
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

        <Label htmlFor="vimMode" className="p-2 border bg-accent rounded flex items-center gap-1 select-none">
          <span className="text-sm">Vim Mode</span>
          <Switch
            id="vimMode"
            className="ml-1"
            checked={vimMode}
            onCheckedChange={(checked) => setVimMode(checked)}
            aria-label="Enable Vim mode"
          />
        </Label>
      </div>
      {children}
    </div>
  );
};
