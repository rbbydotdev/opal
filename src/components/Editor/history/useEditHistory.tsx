import { HistoryPlugin2 } from "@/components/Editor/history/historyPlugin2";
import { HistoryStorageInterface } from "@/Db/HistoryDAO";
import { Cell, markdown$, markdownSourceEditorValue$ } from "@mdxeditor/editor";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const allMarkdown$ = Cell("", (realm) => {
  realm.sub(markdown$, (md) => {
    realm.pub(allMarkdown$, md);
  });
  realm.sub(markdownSourceEditorValue$, (md) => {
    realm.pub(allMarkdown$, md);
  });
  realm.pub(allMarkdown$, realm.getValue(markdown$));
});
export function useEditHistoryPlugin({
  workspaceId,
  documentId,
  historyStorage,
  rootMarkdown,
  shouldTrigger,
}: {
  workspaceId: string;
  documentId: string;
  historyStorage: HistoryStorageInterface;
  rootMarkdown: string;
  shouldTrigger?: () => boolean;
}) {
  const shouldTriggerFn = useRef(shouldTrigger);
  const history = useMemo(
    () =>
      new HistoryPlugin2({
        workspaceId,
        documentId,
        historyStorage,
        rootMarkdown,
        shouldTrigger: shouldTriggerFn.current,
      }),
    [documentId, historyStorage, rootMarkdown, workspaceId]
  );

  const [infoState, setInfoState] = useState(() => history.getState());
  const { edits, selectedEdit, selectedEditMd } = infoState;
  const unsubs = useRef<(() => void)[]>([]);
  const isRestoreState = selectedEdit !== null;

  useEffect(() => {
    return history.onStateUpdate(() => {
      setInfoState({ ...history.getState() });
    });
  }, [history]);

  useEffect(() => {
    history.init();
    return () => {
      history.teardown();
      unsubs.current.forEach((unsub) => unsub());
      unsubs.current = [];
    };
  }, [history]);

  const triggerSave = useCallback(() => {
    void history.triggerSave();
  }, [history]);

  function historyOutputInput(
    onOutput: (md: string) => void,
    onInput: (setMarkdown: (md: string) => void) => void | (() => void)
  ) {
    const us: unknown[] = [];
    us.push(history.handleMarkdown(onOutput));
    us.push(
      onInput((md) => {
        history.setMarkdown(md);
      })
    );
    unsubs.current.push(...(us.filter((u) => typeof u === "function") as (() => void)[]));
    return () => {
      us.filter((u) => typeof u === "function").forEach((us) => us());
    };
  }

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
    historyOutputInput,
  };
}
