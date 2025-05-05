"use client";
import { Workspace } from "@/Db/Workspace";
import { useAllPlugins } from "@/components/Editor/AllPlugins";
// InitializedMDXEditor.tsx
import { MDXEditor, type MDXEditorMethods, type MDXEditorProps } from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { type ForwardedRef } from "react";

// Only import this to the next file
export default function InitializedMDXEditor({
  editorRef,
  currentWorkspace,
  ...props
}: { editorRef: ForwardedRef<MDXEditorMethods> | null; currentWorkspace: Workspace } & MDXEditorProps) {
  // const AllPlugins = useMemo(() => InitAllPlugins({ currentWorkspace }), [currentWorkspace]);
  const plugins = useAllPlugins({ currentWorkspace });
  return <MDXEditor plugins={plugins} {...props} ref={editorRef} />;
}
