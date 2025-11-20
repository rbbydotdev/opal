import { BuildDAO } from "@/data/BuildDAO";
import { createContext, useContext } from "react";

type BuildModalContextType = {
  openNew: (options: { build: BuildDAO }) => Promise<void>;
  close: () => void;
};
export const BuildModalContext = createContext<BuildModalContextType | undefined>(undefined);

export function useBuildModal() {
  const ctx = useContext(BuildModalContext);
  if (!ctx) throw new Error("useBuildModal must be used within a BuildModalProvider");
  return ctx;
}
