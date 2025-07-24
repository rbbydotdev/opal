import { HistoryPlugin } from "@/components/Editor/history/historyPlugin";
import { useCellForRealm } from "@/components/useCellForRealm";
import { useCellValueForRealm } from "@/components/useCellValueForRealm";
import { HistoryDocRecord } from "@/Db/HistoryDAO";
import { Realm } from "@mdxeditor/editor";
import { useCallback } from "react";

export function useEditHistoryPlugin(realm: Realm | undefined) {
  const edits = useCellValueForRealm(HistoryPlugin.edits$, realm);

  const [selectedEdit, setSelectedEdit] = useCellForRealm(HistoryPlugin.selectedEdit$, realm);

  // const lastEdit = useRef<HistoryDocRecord | null>(null);

  const setEdit = useCallback(
    (selectedEdit: HistoryDocRecord | null) => {
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

  const selectedEditMd = useCellValueForRealm(HistoryPlugin.selectedEditDoc$, realm);
  // const editorMd = useCellValueForRealm(HistoryPlugin.allMd$, realm);
  const isRestoreState = selectedEditMd !== null; // && (selectedEditMd ?? "") === (editorMd ?? "");

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
