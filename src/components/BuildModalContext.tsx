import { createContext, useContext } from "react";

type BuildCreationContextType = {
  openNew: () => Promise<void>;
  openEdit: (options: { buildId: string }) => void;
  close: () => void;
};
export const BuildCreationContext = createContext<BuildCreationContextType | undefined>(undefined);

export function useBuildCreation() {
  const ctx = useContext(BuildCreationContext);
  if (!ctx) throw new Error("useBuildCreation must be used within a BuildCreationProvider");
  return ctx;
}
