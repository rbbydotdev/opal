import { useCellValueForRealm } from "@/components/sidebar/tree-view-section/useCellValueForRealm";
import { MainEditorRealmId } from "@/editor/EditorConst";
import { lexical, rootEditor$, useRemoteMDXEditorRealm } from "@mdxeditor/editor";
export function useGetNodeFromEditor(editorRealmId = MainEditorRealmId) {
  const realm = useRemoteMDXEditorRealm(editorRealmId);
  const editor = useCellValueForRealm(rootEditor$, realm);

  const getLexicalNode = (id: string): Promise<lexical.LexicalNode | null> => {
    return new Promise((rs) =>
      editor?.getEditorState().read(() => {
        rs(lexical.$getNodeByKey(id) ?? null);
      })
    );
  };

  const getDOMNode = (id: string): Promise<HTMLElement | null> => {
    return new Promise((rs) =>
      editor?.getEditorState().read(() => {
        rs(editor?.getElementByKey(id) ?? null);
      })
    );
  };

  return { getLexicalNode, getDOMNode };
}
