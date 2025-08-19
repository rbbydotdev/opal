import { MdxEditorSelector } from "@/components/Editor/EditorConst";
import { useEditHistoryPlugin2 } from "@/components/Editor/history/useEditHistory";
import { HistoryStorageInterface } from "@/Db/HistoryDAO";
import { Cell, markdown$, Realm, setMarkdown$ } from "@mdxeditor/editor";
import { useEffect, useRef } from "react";

function MdxEditorInFocus() {
  return Boolean(document.activeElement?.closest(MdxEditorSelector));
}

export function useEditorHistoryPlugin2WithRealm({
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
  realm?: Realm;
}) {
  const {
    edits,
    selectedEdit,
    setEdit,
    rebaseHistory,
    resetAndRestore,
    clearAll,
    triggerSave,
    isRestoreState,
    selectedEditMd,
    historyOutputInput,
  } = useEditHistoryPlugin2({
    workspaceId: workspaceId!,
    documentId,
    historyStorage,
    rootMarkdown,
    shouldTrigger: MdxEditorInFocus, //to assure triggers only happen when there is a user interaction
  });

  const markdown$Ref = useRef(
    Cell("", (realm) => {
      realm.sub(markdown$, (md) => {
        realm.pub(markdown$Ref.current, md);
      });
    })
  );

  useEffect(() => {
    if (realm) {
      historyOutputInput(
        (md) => realm.pub(setMarkdown$, md),
        (setMarkdown) => realm.singletonSub(markdown$Ref.current, (md) => setMarkdown(md))
      );
    }
  }, [historyOutputInput, realm]);
  return {
    edits,
    selectedEdit,
    setEdit,
    rebaseHistory,
    resetAndRestore,
    clearAll,
    triggerSave,
    isRestoreState,
    selectedEditMd,
  };
}
