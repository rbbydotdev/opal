import {
  LexicalTreeViewNode,
  lexicalToTreeView,
} from "@/components/sidebar/tree-view-section/treeViewDisplayNodesLexical";
import { useCellValueForRealm } from "@/components/sidebar/tree-view-section/useCellValueForRealm";
import { MainEditorRealmId } from "@/editors/EditorConst";
import { lexical, rootEditor$, useRemoteMDXEditorRealm } from "@mdxeditor/editor";
import debounce from "debounce";
import { useCallback, useEffect, useState } from "react";

export function useEditorDisplayTree(editorRealmId = MainEditorRealmId) {
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
    }, 100); // Reduced debounce for faster tree updates after drag/drop
    return editor?.registerUpdateListener(debouncedUpdateListener);
  }, [editor, updateDisplayTree]);
  return { displayTree, flatTree };
}
