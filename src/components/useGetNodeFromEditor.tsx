import { MainEditorRealmId } from "@/components/Editor/MainEditorRealmId";
import { useCellValueForRealm } from "@/components/useCellValueForRealm";
import { lexical, rootEditor$, useRemoteMDXEditorRealm } from "@mdxeditor/editor";
import { useEffect, useRef } from "react";
export function useGetNodeFromEditor(editorRealmId = MainEditorRealmId) {
  const realm = useRemoteMDXEditorRealm(editorRealmId);
  const editor = useCellValueForRealm(rootEditor$, realm);
  const getLexicalNodeCbRef = useRef<GetLexicalNodeFnType>(() => {});
  const getDOMNodeCbRef = useRef<GetDOMNodeFnType>(() => {});

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updateNodeCallbacks = (editorInstance: typeof editor, editorState: lexical.EditorState) => {
    getLexicalNodeCbRef.current = (id, cb) => {
      editorState?.read(() => {
        cb(lexical.$getNodeByKey(id) ?? null);
      });
    };
    getDOMNodeCbRef.current = (id, cb) => {
      editorState?.read(() => {
        cb(editorInstance?.getElementByKey(id) ?? null);
      });
    };
  };

  useEffect(() => {
    const editorState = editor?.getEditorState();
    editorState?.read(() => {
      updateNodeCallbacks(editor, editorState);
    });
  }, [editor, updateNodeCallbacks]);

  useEffect(
    () =>
      editor?.registerUpdateListener(({ editorState }) => {
        editorState?.read(() => {
          updateNodeCallbacks(editor, editorState);
        });
      }),
    [editor, updateNodeCallbacks]
  );
  const getDOMNode = async (id: string) =>
    new Promise<HTMLElement | null>((resolve) => {
      getDOMNodeCbRef.current(id, resolve);
    });
  const getLexicalNode = async (id: string) =>
    new Promise<lexical.LexicalNode | null>((resolve) => {
      getLexicalNodeCbRef.current(id, resolve);
    });
  return { getLexicalNode, getDOMNode };
}
type GetLexicalNodeFnType = (id: string, cb: (node: lexical.LexicalNode | null) => void) => void;
type GetDOMNodeFnType = (id: string, cb: (node: HTMLElement | null) => void) => void;
