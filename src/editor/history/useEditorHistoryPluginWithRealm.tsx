import { HistoryStorageInterface } from "@/data/HistoryTypes";
import { MdxEditorSelector, setMarkdownOnly$ } from "@/editor/EditorConst";
import { useEditHistoryPlugin } from "@/editor/history/useEditHistory";
import { Cell, markdown$, Realm } from "@mdxeditor/editor";
import { useEffect, useRef } from "react";

function MdxEditorInFocus() {
  return Boolean(document.activeElement?.closest(MdxEditorSelector));
}

export function useEditorHistoryPluginWithRealm({
  workspaceId,
  documentId,
  historyStorage,
  rootMarkdown,
  realm,
  enabled = true,
}: {
  workspaceId: string;
  documentId: string;
  historyStorage: HistoryStorageInterface;
  rootMarkdown: string;
  realm?: Realm;
  enabled?: boolean;
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
  } = useEditHistoryPlugin({
    workspaceId: workspaceId!,
    documentId,
    historyStorage,
    rootMarkdown,
    shouldTrigger: MdxEditorInFocus, //to assure triggers only happen when there is a user interaction
    enabled,
  });

  const markdown$Ref = useRef(
    Cell("", (realm) => {
      realm.sub(markdown$, (md) => realm.pub(markdown$Ref.current, md));
    })
  );

  useEffect(() => {
    if (realm && enabled && historyOutputInput) {
      return historyOutputInput(
        (md) => realm.pub(setMarkdownOnly$, md),
        (setMarkdown) => realm.singletonSub(markdown$Ref.current, (md) => setMarkdown(md))
      );
    }
  }, [historyOutputInput, realm, enabled]);

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
