import { HistoryPlugin2 } from "@/components/Editor/history/historyPlugin2";
import { useCellValueForRealm } from "@/components/useCellValueForRealm";
import { HistoryStorageInterface } from "@/Db/HistoryDAO";
import { Cell, markdown$, markdownSourceEditorValue$, Realm, setMarkdown$ } from "@mdxeditor/editor";
import { useCallback, useEffect, useMemo, useState } from "react";

const allMarkdown$ = Cell("", (realm) => {
  realm.sub(markdown$, (md) => {
    realm.pub(allMarkdown$, md);
  });
  realm.sub(markdownSourceEditorValue$, (md) => {
    realm.pub(allMarkdown$, md);
  });
  realm.pub(allMarkdown$, realm.getValue(markdown$));
});
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
      realm.singletonSub(allMarkdown$, history.setMarkdown);
      history.handleMarkdown((md) => realm.pub(setMarkdown$, md));
    }
    return () => {
      history.teardown();
    };
  }, [history, realm]);
  const [{ edits, selectedEdit, selectedEditMd }, setInfoState] = useState(() => history.getState());
  const isRestoreState = selectedEdit !== null;
  useEffect(() => {
    return history.onStateUpdate(() => {
      setInfoState({ ...history.getState() });
    });
  }, [history]);

  const allMd = useCellValueForRealm(allMarkdown$, realm);
  const triggerSave = useCallback(() => {
    if (allMd) {
      void history.triggerSave(allMd);
    } else {
      console.warn("attempt to trigger save when allMd is null");
    }
  }, [history, allMd]);

  return {
    edits: edits ?? [],
    selectedEdit,
    selectedEditMd,
    triggerSave: triggerSave,
    clearSelectedEdit: history.clearSelectedEdit,
    resetAndRestore: history.resetAndRestore,
    rebaseHistory: history.rebaseHistory,
    isRestoreState,
    setEdit: history.setSelectedEdit,
    reset: history.clearSelectedEdit,
    clearAll: history.clearAll,
  };
}
