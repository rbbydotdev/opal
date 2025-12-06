import { BuildDAO } from "@/data/dao/BuildDAO";
import { createContext, useContext } from "react";

type BuildCreationContextType = {
  openNew: () => BuildDAO;
  openEdit: (options: { buildId: string }) => void;
  close: () => void;
};
export const BuildCreationContext = createContext<BuildCreationContextType | undefined>(undefined);

export function useBuildCreation() {
  const ctx = useContext(BuildCreationContext);
  if (!ctx) {
    throw new Error("useBuildCreation must be used within a BuildCreationProvider");
  }
  return ctx;
}
