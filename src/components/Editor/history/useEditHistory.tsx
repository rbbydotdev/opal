import { HistoryPlugin2 } from "@/components/Editor/history/historyPlugin2";
import { HistoryStorageInterface } from "@/Db/HistoryDAO";
import { markdown$, markdownSourceEditorValue$, Realm, setMarkdown$ } from "@mdxeditor/editor";
import { useEffect, useMemo, useSyncExternalStore } from "react";

export function useEditHistoryPlugin2({
  workspaceId,
  documentId,
  historyStorage,
  rootMarkdown,
  realm,
}: {
  workspaceId: string;
  documentId: string;
  historyStorage: HistoryStorageInterface;
  rootMarkdown: string;
  realm: Realm | undefined;
}) {
  const history = useMemo(
    () => new HistoryPlugin2({ workspaceId, documentId, historyStorage, rootMarkdown }),
    [documentId, historyStorage, rootMarkdown, workspaceId]
  );
  useEffect(() => {
    if (realm) {
      history.init();
      realm.singletonSub(markdown$, history.setMarkdown);
      realm.singletonSub(markdownSourceEditorValue$, history.setMarkdown);
      history.handleMarkdown((md) => realm.pub(setMarkdown$, md));
    }
    return () => {
      history.teardown();
    };
  }, [history, realm]);
  const { edits, selectedEdit, selectedEditMd } = useSyncExternalStore(history.onStateUpdate, history.getState);
  const isRestoreState = selectedEditMd !== null; // && (selectedEditMd ?? "") === (editorMd ?? "");

  return {
    edits: edits ?? [],
    selectedEdit: isRestoreState ? selectedEdit : null,
    selectedEditMd,
    triggerSave: history.triggerSave,
    clearSelectedEdit: history.clearSelectedEdit,
    resetAndRestore: history.resetAndRestore,
    rebaseHistory: history.rebaseHistory,
    isRestoreState,
    setEdit: history.setSelectedEdit,
    reset: history.clearSelectedEdit,
    clearAll: history.clearAll,
  };
}
