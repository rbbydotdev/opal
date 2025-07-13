import { DocumentChange } from "@/components/Editor/HistoryDB";
import { HistoryState } from "@/components/Editor/historyPlugin";
import { useCellForRealm } from "@/components/useCellForRealm";
import { Realm } from "@mdxeditor/editor";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useRef } from "react";
import { historyDB } from "./HistoryDB";

export function useEditHistoryPlugin(
  documentId: string,
  realm: Realm | undefined
): readonly [DocumentChange[], DocumentChange | null, (edit: DocumentChange) => boolean, () => void, () => void] {
  //Sticky Doc Id!
  const DocIdRef = useRef(documentId);
  const documentIdRef = documentId ?? DocIdRef.current;

  const edits = useLiveQuery(
    async () => {
      if (!documentIdRef) {
        console.error("No document ID provided to useEditHistoryPlugin");
        return [];
      }
      return await historyDB.getEdits(documentIdRef);
    },
    [documentIdRef] // Dependencies array to re-run the query if documentId changes
  );

  const [edit, setSelectedEdit] = useCellForRealm(HistoryState.selectedEdit$, realm);

  const lastEdit = useRef<DocumentChange | null>(null);

  const setEdit = useCallback(
    (selectedEdit: DocumentChange) => {
      setSelectedEdit(selectedEdit);
      realm?.pub(HistoryState.selectedEdit$, selectedEdit);
      return true;
    },
    [realm, setSelectedEdit]
  );

  const reset = useCallback(() => {
    setSelectedEdit(null);
    realm?.pub(HistoryState.resetMd$);
  }, [realm, setSelectedEdit]);

  const clearAll = useCallback(() => {
    setSelectedEdit(null);
    realm?.pub(HistoryState.clearAll$);
  }, [realm, setSelectedEdit]);

  //poor mans pub sub for resetting the selected edit, when text in editor is updated and selected edit
  //no longer is in sync with the current text
  useEffect(() => {
    if (edits?.[0] !== lastEdit.current) {
      if (edits?.[0]) setSelectedEdit(null);
    }
    if (lastEdit.current) lastEdit.current = edits?.[0] ?? null;
  }, [documentIdRef, edits, setSelectedEdit]);

  return [edits ?? [], edit ?? null, setEdit, reset, clearAll] as const;
}
