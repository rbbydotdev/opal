import {
  LexicalTreeViewNode,
  lexicalToTreeView,
} from "@/components/sidebar/tree-view-section/treeViewDisplayNodesLexical";
import { useCellValueForRealm } from "@/components/sidebar/tree-view-section/useCellValueForRealm";
import { MainEditorRealmId } from "@/editor/EditorConst";
import { debounce } from "@/lib/debounce";
import { lexical, rootEditor$, useRemoteMDXEditorRealm } from "@mdxeditor/editor";
import React, { useCallback, useEffect, useState } from "react";

const DisplayTreeContext = React.createContext<{
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

function useEditorDisplayTree(editorRealmId = MainEditorRealmId) {
  const realm = useRemoteMDXEditorRealm(editorRealmId);
  const editor = useCellValueForRealm(rootEditor$, realm);
  const [displayTree, setDisplayTree] = useState<LexicalTreeViewNode | null>(null);
  const [flatTree, setFlatTree] = useState<string[]>([]);

  const updateDisplayTree = useCallback(
    function (displayTree: LexicalTreeViewNode | null) {
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
    },
    [setDisplayTree, setFlatTree]
  );

  useEffect(() => {
    editor?.getEditorState()?.read(() => updateDisplayTree(lexicalToTreeView(lexical.$getRoot())));
  }, [editor, updateDisplayTree]);

  useEffect(() => {
    const debouncedUpdateListener = debounce(({ editorState }: { editorState: lexical.EditorState }) => {
      editorState?.read(() => updateDisplayTree(lexicalToTreeView(lexical.$getRoot())));
    }, 500);
    return editor?.registerUpdateListener(debouncedUpdateListener);
  }, [editor, updateDisplayTree]);
  return { displayTree, flatTree };
}
