import { isSourceMimeType } from "@/source-editor/SourceMimeType";
import React from "react";

type EditorProps = React.HTMLAttributes<HTMLDivElement> & {
  id: string;
};

export function Editor({ children, id, ...props }: EditorProps) {
  return <React.Fragment {...props}>{children}</React.Fragment>;
}

export function EditorSelector({
  children,
  selected,
}: {
  children: React.ReactElement<EditorProps> | React.ReactElement<EditorProps>[];
  selected: string;
}) {
  const editorChildren = React.Children.toArray(children)
    .filter(React.isValidElement)
    .map((child) => child as React.ReactElement<EditorProps>);

  const selectedEditor = editorChildren.find((child) => child.props.id === selected);

  return selectedEditor || null;
}
export function getEditor({
  isRecognized,
  isMarkdown,
  isSourceView,
  hasConflicts,
  mimeType,
}: {
  isRecognized: boolean;
  isMarkdown: boolean;
  isSourceView: boolean;
  hasConflicts: boolean;
  mimeType: string;
}) {
  if (!isRecognized) {
    return "unrecognized";
  }
  if (isMarkdown && !isSourceView && !hasConflicts && isSourceMimeType(mimeType)) {
    return "markdown";
  }
  return "source";
}
