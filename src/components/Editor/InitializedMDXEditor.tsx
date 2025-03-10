"use client";
import { AllPlugins } from "@/components/Editor/AllPlugins";
// InitializedMDXEditor.tsx
import { MDXEditor, type MDXEditorMethods, type MDXEditorProps } from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import type { ForwardedRef } from "react";

// Only import this to the next file
export default function InitializedMDXEditor({
  editorRef,
  ...props
}: { editorRef: ForwardedRef<MDXEditorMethods> | null } & MDXEditorProps) {
  return <MDXEditor plugins={AllPlugins} {...props} ref={editorRef} />;
}
