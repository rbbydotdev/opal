import { DocumentChange } from "@/components/Editor/HistoryDB";
import { HistoryPlugin } from "@/components/Editor/historyPlugin";
import { MainEditorRealmId } from "@/components/Editor/MainEditorRealmId";
import { useCellForRealm } from "@/components/useCellForRealm";
import { useRemoteMDXEditorRealm } from "@mdxeditor/editor";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useRef } from "react";
import { historyDB } from "./HistoryDB";

/**
 * Custom hook to fetch and observe the list of edits for a specific document ID.
 * @param documentIdRef The ID of the document to fetch edits for.
 * @returns A tuple containing:
 *  - An array of DocumentChange objects or an empty array if still loading.
 *  - The currently selected DocumentChange or null.
 *  - A function to set the selected edit by its ID.
 *  - A function to reset the edit selection and markdown.
 */
export function useEditHistoryPlugin(
  documentId: string
): readonly [DocumentChange[], DocumentChange | null, (edit: DocumentChange) => boolean, () => void, () => void] {
  //Sticky Doc Id!
  const DocIdRef = useRef(documentId);
  const documentIdRef = documentId ?? DocIdRef.current;
  useEffect(() => {
    if (documentId) {
      DocIdRef.current = documentId;
    }
  }, [documentId]);

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

  const realm = useRemoteMDXEditorRealm(MainEditorRealmId);
  const [edit, setSelectedEdit] = useCellForRealm(HistoryPlugin.selectedEdit$, realm);

  const lastEdit = useRef<DocumentChange | null>(null);

  const setEdit = useCallback(
    (selectedEdit: DocumentChange) => {
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
