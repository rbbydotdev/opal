import React from "react";

type EditorProps = React.HTMLAttributes<HTMLDivElement> & {
  id: string;
};

export function Editor({ children, id, ...props }: EditorProps) {
  return <React.Fragment {...props}>{children}</React.Fragment>;
}

export function Editors({
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
