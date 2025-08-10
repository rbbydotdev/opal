// InitializedMDXEditor.tsx
import { MDXEditor, MDXEditorMethods, MDXEditorProps } from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { ForwardedRef } from "react";
import "./mdxeditor-custom-styles.css";

// Only import this to the next file
export const Editor = ({
  editorRef,
  ...props
}: { editorRef: ForwardedRef<MDXEditorMethods> | null } & MDXEditorProps) => {
  return <MDXEditor {...props} ref={editorRef} />;
};
