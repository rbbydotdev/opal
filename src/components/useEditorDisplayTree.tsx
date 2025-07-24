import { MainEditorRealmId } from "@/components/Editor/MainEditorRealmId";
import { useCellValueForRealm } from "@/components/useCellValueForRealm";
import { LexicalTreeViewNode, lexicalToTreeView } from "@/lib/lexical/treeViewDisplayNodesLexical";
import { lexical, rootEditor$, useRemoteMDXEditorRealm } from "@mdxeditor/editor";
import React, { useEffect, useState } from "react";

export const DisplayTreeContext = React.createContext<{
  displayTree: LexicalTreeViewNode | null;
  flatTree: string[];
}>({
  displayTree: null,
  flatTree: [],
});

export function DisplayTreeProvider({
  children,
  editorRealmId = MainEditorRealmId,
}: {
  children: React.ReactNode;
  editorRealmId?: string;
}) {
  const { displayTree, flatTree } = useEditorDisplayTree(editorRealmId);
  return <DisplayTreeContext.Provider value={{ displayTree, flatTree }}>{children}</DisplayTreeContext.Provider>;
}

export function useEditorDisplayTreeCtx() {
  const context = React.useContext(DisplayTreeContext);
  if (!context) {
    throw new Error("useDisplayTree must be used within a DisplayTreeProvider");
  }
  return context;
}

export function useEditorDisplayTree(editorRealmId = MainEditorRealmId) {
  const realm = useRemoteMDXEditorRealm(editorRealmId);
  const editor = useCellValueForRealm(rootEditor$, realm);
  const [displayTree, setDisplayTree] = useState<LexicalTreeViewNode | null>(null);
  const [flatTree, setFlatTree] = useState<string[]>([]);
  function updateDisplayTree(displayTree: LexicalTreeViewNode | null) {
    setDisplayTree(displayTree);
    const tree: string[] = [];
    const nodes = !displayTree ? [] : [displayTree];
    while (nodes.length > 0) {
      const node = nodes.shift()!;
      tree.push(node.id);
      if (node.children && node.children.length > 0) {
        nodes.push(...node.children);
      }
    }
    setFlatTree(Array.from(new Set(tree)));
  }
  useEffect(
    () => editor?.getEditorState()?.read(() => updateDisplayTree(lexicalToTreeView(lexical.$getRoot()))),
    [editor]
  );
  useEffect(
    () =>
      editor?.registerUpdateListener(({ editorState }) =>
        editorState?.read(() => updateDisplayTree(lexicalToTreeView(lexical.$getRoot())))
      ),
    [editor]
  );
  return { displayTree, flatTree };
}
