import { HistoryPlugin } from "@/components/Editor/history/historyPlugin";
import { HistoryPlugin2 } from "@/components/Editor/history/historyPlugin2";
import { useCellForRealm } from "@/components/useCellForRealm";
import { useCellValueForRealm } from "@/components/useCellValueForRealm";
import { HistoryDocRecord, HistoryStorageInterface } from "@/Db/HistoryDAO";
import { Realm } from "@mdxeditor/editor";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

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

  const triggerSave = useCallback(() => {
    realm?.pub(HistoryPlugin.triggerSave$);
  }, [realm]);

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
    triggerSave,
    isRestoreState,
    setEdit,
    reset,
    clearAll,
  };
}

export function useEditHistoryPlugin2(historyProps: {
  workspaceId: string;
  documentId: string;
  historyStorage: HistoryStorageInterface;
  rootMarkdown: string;
}) {
  const history = useMemo(() => new HistoryPlugin2(historyProps), [historyProps]);
  useEffect(() => {
    history.init();
    return () => {
      history.teardown();
    };
  }, [history]);
  const { edits, selectedEdit, selectedEditMd } = useSyncExternalStore(history.onStateUpdate, history.getState);
  const setEdit = useCallback(
    (selectedEdit: HistoryDocRecord | null) => history.setSelectedEdit(selectedEdit),
    [history]
  );

  const reset = useCallback(() => history.reset(), [history]);

  const triggerSave = useCallback(() => history.triggerSave(), [history]);

  const clearAll = useCallback(() => history.clearAll(), [history]);

  // const editorMd = useCellValueForRealm(HistoryPlugin.allMd$, realm);
  const isRestoreState = selectedEditMd !== null; // && (selectedEditMd ?? "") === (editorMd ?? "");

  return {
    edits: edits ?? [],
    selectedEdit: isRestoreState ? selectedEdit : null,
    selectedEditMd,
    triggerSave,
    isRestoreState,
    setEdit,
    reset,
    clearAll,
  };
}
