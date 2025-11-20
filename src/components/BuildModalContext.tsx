import { createContext, useContext } from "react";

type BuildModalContextType = {
  openNew: () => Promise<void>;
  openEdit: (options: { buildId: string }) => void;
  close: () => void;
};
export const BuildModalContext = createContext<BuildModalContextType | undefined>(undefined);

export function useBuildModal() {
  const ctx = useContext(BuildModalContext);
  if (!ctx) throw new Error("useBuildModal must be used within a BuildModalProvider");
  return ctx;
}
