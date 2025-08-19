import { useEditHistoryPlugin2 } from "@/components/Editor/history/useEditHistory";
import { useWorkspaceDocumentId } from "@/components/Editor/history/useWorkspaceDocumentId";
import { useFileContents } from "@/context/useFileContents";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { HistoryStorageInterface } from "@/Db/HistoryDAO";
import { useEffect, useRef } from "react";
export function useEditorHistoryPlugin2WithContentWatch({
  workspaceId,
  historyStorage,
}: {
  workspaceId: string;
  historyStorage: HistoryStorageInterface;
}) {
  const cbRef = useRef<(md: string) => void>(() => {});
  const { currentWorkspace } = useWorkspaceContext();
  const { initialContents, updateContents } = useFileContents({
    currentWorkspace,
    listenerCb: (md) => cbRef.current(md || ""),
  });

  const documentId = useWorkspaceDocumentId(String(initialContents || ""));
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
    rootMarkdown: initialContents || "",
  });

  useEffect(() => {
    historyOutputInput(
      (md) => updateContents(md),
      (setMarkdown) => {
        cbRef.current = setMarkdown;
      }
    );
  }, [historyOutputInput, updateContents]);

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
