import { Confirm, useConfirmCmd } from "@/components/Confirm";
import React, { createContext, useContext } from "react";

type ConfirmContextType = {
  open: <U extends () => unknown>(
    cb: U,
    title: React.ReactNode,
    description: React.ReactNode
  ) => Promise<ReturnType<U>>;
};
const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { open, cmdRef } = useConfirmCmd();

  return (
    <ConfirmContext.Provider value={{ open }}>
      {children}
      <Confirm cmdRef={cmdRef} />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}
