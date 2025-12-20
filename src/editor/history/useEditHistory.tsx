import { HistoryStorageInterface } from "@/data/dao/HistoryDocRecord";
import { HistoryPlugin2 } from "@/editor/history/historyPlugin2";
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
  enabled = true,
}: {
  workspaceId: string;
  documentId: string;
  historyStorage: HistoryStorageInterface;
  rootMarkdown: string;
  shouldTrigger?: () => boolean;
  enabled?: boolean;
}) {
  const shouldTriggerFn = useRef(shouldTrigger);
  const history = useMemo(
    () =>
      enabled
        ? new HistoryPlugin2({
            workspaceId,
            documentId,
            historyStorage,
            rootMarkdown,
            shouldTrigger: shouldTriggerFn.current,
          })
        : null,
    [documentId, historyStorage, rootMarkdown, workspaceId, enabled]
  );

  const [{ edits, selectedEdit, selectedEditMd }, setInfoState] = useState(() =>
    history ? history.getState() : { edits: [], selectedEdit: null, selectedEditMd: null }
  );

  const unsubs = useRef<(() => void)[]>([]);
  const isRestoreState = selectedEdit !== null;

  useEffect(() => {
    if (!history) return;
    return history.onStateUpdate(() => {
      setInfoState({ ...history.getState() });
    });
  }, [history]);

  useEffect(() => {
    if (!history) return;
    history.init();
    return () => {
      history.teardown();
      unsubs.current.forEach((unsub) => unsub());
      unsubs.current = [];
    };
  }, [history]);

  const triggerSave = useCallback(() => {
    if (history) {
      void history.triggerSave();
    }
  }, [history]);

  function historyOutputInput(
    onOutput: (md: string) => void,
    onInput: (setMarkdown: (md: string) => void) => void | (() => void)
  ) {
    if (!history) {
      return () => {};
    }
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
    clearSelectedEdit: history?.clearSelectedEdit ?? (() => {}),
    resetAndRestore: history?.resetAndRestore ?? (async () => {}),
    rebaseHistory: history?.rebaseHistory ?? (() => {}),
    isRestoreState,
    setEdit: history?.setSelectedEdit ?? (async () => {}),
    reset: history?.clearSelectedEdit ?? (() => {}),
    clearAll: history?.clearAll ?? (async () => {}),
    historyOutputInput,
  };
}
