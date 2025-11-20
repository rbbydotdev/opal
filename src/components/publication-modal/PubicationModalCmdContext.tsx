import { BuildDAO } from "@/data/BuildDAO";
import { createContext, useContext } from "react";

export type PubicationModalCmd = {
  open: ({ build }: { build: BuildDAO }) => void;
  close: () => void;
};
export function usePublicationModalCmd() {
  return useContext(PublicationModalContext);
}
export const PublicationModalContext = createContext<PubicationModalCmd>({
  open: () => {},
  close: () => {},
});
