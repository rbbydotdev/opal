import { DocumentChangeDAO } from "@/components/Editor/history/HistoryDB";
import { HistoryPlugin } from "@/components/Editor/history/historyPlugin";
import { useCellForRealm } from "@/components/useCellForRealm";
import { useCellValueForRealm } from "@/components/useCellValueForRealm";
import { Realm } from "@mdxeditor/editor";
import { useCallback, useRef } from "react";

export function useEditHistoryPlugin(documentId: string, realm: Realm | undefined) {
  const edits = useCellValueForRealm(HistoryPlugin.edits$, realm);

  const [selectedEdit, setSelectedEdit] = useCellForRealm(HistoryPlugin.selectedEdit$, realm);

  const lastEdit = useRef<DocumentChangeDAO | null>(null);

  const setEdit = useCallback(
    (selectedEdit: DocumentChangeDAO | null) => {
      setSelectedEdit(selectedEdit);
      realm?.pub(HistoryPlugin.selectedEdit$, selectedEdit);
      return true;
    },
    [realm, setSelectedEdit]
  );

  const reset = useCallback(() => {
    setSelectedEdit(null);
    realm?.pub(HistoryPlugin.resetMd$);
  }, [realm, setSelectedEdit]);

  const clearAll = useCallback(() => {
    setSelectedEdit(null);
    realm?.pub(HistoryPlugin.clearAll$);
  }, [realm, setSelectedEdit]);

  //pub sub for resetting the selected edit, when text in editor is updated and selected edit
  //no longer is in sync with the current text
  // useEffect(() => {
  //   if (edits?.[0] !== lastEdit.current) {
  //     if (edits?.[0]) setSelectedEdit(null);
  //   }
  //   if (lastEdit.current) lastEdit.current = edits?.[0] ?? null;
  // }, [documentId, edits, setSelectedEdit]);

  // const [selectedEditMd, setSelectedEditDoc] = useState<string | null>(null);
  const selectedEditMd = useCellValueForRealm(HistoryPlugin.selectedEditDoc$, realm);
  const editorMd = useCellValueForRealm(HistoryPlugin.allMd$, realm);
  const isRestoreState = selectedEditMd !== null && selectedEditMd === editorMd;

  return {
    edits: edits ?? [],
    selectedEdit: isRestoreState ? selectedEdit : null,
    selectedEditMd,
    isRestoreState,
    setEdit,
    reset,
    clearAll,
  };
}
