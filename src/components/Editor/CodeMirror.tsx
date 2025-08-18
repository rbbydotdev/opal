// import { markdownWithFrontMatter } from "@/components/SourceEditor/markdowExt";
import {
  CodeMirrorHighlightURLRange,
  getHighlightRangesFromURL,
} from "@/components/Editor/CodeMirrorSelectURLRangePlugin";
import { setViewMode } from "@/components/Editor/view-mode/handleUrlParamViewMode";
import { Button } from "@/components/ui/button";
import { useCurrentFilepath } from "@/context/WorkspaceHooks";
import { cn } from "@/lib/utils";
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
}: {
  mimeType: "text/css" | "text/plain" | "text/markdown" | string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
  className?: string;
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
      EditorView.lineWrapping,

      CodeMirrorHighlightURLRange(getHighlightRangesFromURL(window.location.href, "hash")),
      keymap.of([
        indentWithTab,
        // {
        //   key: "Mod-e", // "Mod" = Cmd on Mac, Ctrl on Windows/Linux
        //   run: (view) => {
        //     view.focus();
        //     return true; // prevent default
        //   },
        // },
      ]),
      ext,
      EditorView.updateListener.of((update) => {
        if (update.docChanged && onChange) {
          onChange(update.state.doc.toString());
        }
      }),
      EditorView.editable.of(!readOnly),
      EditorView.theme({
        "&": { height: "100%" }, // Make the editor fill its parent
        ".cm-scroller": { height: "100%" }, // Make the scroll area fill the editor
        ".cm-content": {
          padding: 0,
        },
      }),
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

  return (
    <>
      <CodeMirrorToolbar />
      <div className={cn("code-mirror-source-editor bg-background h-full", className)} ref={editorRef} />
    </>
  );
};

const CodeMirrorToolbar = () => {
  const { isMarkdown } = useCurrentFilepath();
  return (
    <div className="flex items-center justify-between p-2 bg-muted h-12">
      {isMarkdown && (
        <Button variant="outline" size="sm" onClick={() => setViewMode("rich-text", "hash+search")}>
          <span className="text-xs flex justify-center items-center gap-1">
            <ChevronLeftIcon size={12} />
            <FileText size={12} /> Rich Text
          </span>
        </Button>
      )}
    </div>
  );
};
