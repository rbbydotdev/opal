import { HistoryDB, HistoryStorageInterface } from "@/components/Editor/history/HistoryDB";
import { createContext, ReactNode, useContext, useMemo } from "react";

type HistoryStorageValue = {
  historyStorage: HistoryStorageInterface;
};

const HistoryStorageContext = createContext<HistoryStorageValue | undefined>(undefined);

export function HistoryStorageProvider({ children }: { children: ReactNode }) {
  const historyStorage = useMemo(() => new HistoryDB(), []);
  return <HistoryStorageContext.Provider value={{ historyStorage }}>{children}</HistoryStorageContext.Provider>;
}

export const useHistoryStorage = () => {
  const context = useContext(HistoryStorageContext);
  if (!context) {
    throw new Error("useHistoryStorage must be used within a HistoryStorageProvider");
  }
  return context.historyStorage;
};
