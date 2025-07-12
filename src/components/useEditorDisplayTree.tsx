import { MainEditorRealmId } from "@/components/Editor/MainEditorRealmId";
import { useCellValueForRealm } from "@/components/useCellValueForRealm";
import { LexicalTreeViewNode, lexicalToTreeView } from "@/lib/lexical/treeViewDisplayNodesLexical";
import { lexical, rootEditor$, useRemoteMDXEditorRealm } from "@mdxeditor/editor";
import { useEffect, useState } from "react";

export function useEditorDisplayTree(editorRealmId = MainEditorRealmId) {
  const realm = useRemoteMDXEditorRealm(editorRealmId);
  const editor = useCellValueForRealm(rootEditor$, realm);
  const [displayTree, setDisplayTree] = useState<LexicalTreeViewNode | null>(null);
  useEffect(() => {
    const editorState = editor?.getEditorState();
    editorState?.read(() => {
      setDisplayTree(lexicalToTreeView(lexical.$getRoot()));
    });
  }, [editor]);
  useEffect(
    () =>
      editor?.registerUpdateListener(({ editorState }) => {
        editorState?.read(() => {
          setDisplayTree(lexicalToTreeView(lexical.$getRoot()));
        });
      }),
    [editor]
  );
  return displayTree;
}
