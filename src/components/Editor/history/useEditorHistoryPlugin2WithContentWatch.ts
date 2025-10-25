import { useEditHistoryPlugin } from "@/components/Editor/history/useEditHistory";
import { useWorkspaceDocumentId } from "@/components/Editor/history/useWorkspaceDocumentId";
import { useFileContents } from "@/context/useFileContents";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { HistoryStorageInterface } from "@/Db/HistoryTypes";
import { useEffect, useRef } from "react";
export function useEditorHistoryPlugin2WithContentWatch({
  workspaceId,
  historyStorage,
  shouldTrigger,
}: {
  workspaceId: string;
  historyStorage: HistoryStorageInterface;
  shouldTrigger?: () => boolean;
}) {
  const cbRef = useRef<(md: string) => void>(() => {});
  const { currentWorkspace } = useWorkspaceContext();
  const { contents: initialContents, writeFileContents } = useFileContents({
    currentWorkspace,
    onContentChange: (c) => cbRef.current(c),
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
  } = useEditHistoryPlugin({
    workspaceId: workspaceId!,
    documentId,
    historyStorage,
    rootMarkdown: initialContents || "",
    shouldTrigger,
  });

  useEffect(() => {
    return historyOutputInput(
      (md) => writeFileContents(md),
      (setMarkdown) => {
        cbRef.current = setMarkdown;
      }
    );
  }, [historyOutputInput, writeFileContents]);

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
