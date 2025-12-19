import { HistoryDAO } from "@/data/dao/HistoryDAO";
import { NullHistoryDAO } from "@/data/dao/NullHistoryDAO";
import { HistoryStorageInterface } from "@/data/HistoryTypes";
import { useToggleHistoryImageGeneration } from "@/editor/history/useToggleHistoryImageGeneration";
import { useResource } from "@/hooks/useResource";
import { createContext, ReactNode, useContext, useEffect } from "react";

// --- Context and Provider for HistorySnapDB ---
const HistorySnapDBContext = createContext<HistorySnapDBContextType>(new NullHistoryDAO());
type HistorySnapDBContextType = HistoryStorageInterface | null;
interface HistorySnapDBProviderProps {
  documentId: string | null;
  workspaceId: string;
  children: ReactNode;
}
const NULL_HISTORY_DAO = new NullHistoryDAO();

export function HistorySnapDBProvider({ documentId, children }: HistorySnapDBProviderProps) {
  const historyDB = useResource<HistoryStorageInterface>(() => new HistoryDAO(), [], NULL_HISTORY_DAO);
  const { isHistoryImageGenerationEnabled, handleEditPreview } = useToggleHistoryImageGeneration();

  useEffect(() => {
    if (documentId && historyDB && isHistoryImageGenerationEnabled) {
      return historyDB.onNewEdit(documentId, (edit) => {
        void handleEditPreview(edit);
      });
    }
  }, [documentId, handleEditPreview, historyDB, isHistoryImageGenerationEnabled]);

  return (
    <HistorySnapDBContext.Provider value={historyDB || NULL_HISTORY_DAO}>{children}</HistorySnapDBContext.Provider>
  );
}
export function useSnapHistoryDB(): HistoryStorageInterface {
  const ctx = useContext(HistorySnapDBContext);
  if (!ctx) {
    throw new Error("useSnapHistoryDB must be used within a HistorySnapDBProvider");
  }
  return ctx;
}
