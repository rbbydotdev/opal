import { IPoolWorker, PoolManager, Resource } from "@/components/PoolWorker";
import React, { createContext, useContext, useMemo } from "react";

type PoolContextValue<TWorker extends IPoolWorker<Resource<any>>> = {
  work: (pw: TWorker) => Promise<any>;
  flush: () => void;
};

export function CreatePoolContext<TWorker extends IPoolWorker<Resource<any>>>() {
  const Context = createContext<PoolContextValue<TWorker> | null>(null);
  Context.displayName = "PoolContext";

  const PoolProvider = ({ children, max }: { children: React.ReactNode; max: number }) => {
    const contextValue: PoolContextValue<TWorker> = useMemo(() => new PoolManager(max), [max]);
    return <Context.Provider value={contextValue}>{children}</Context.Provider>;
  };

  const usePool = () => {
    const context = useContext(Context);
    if (!context) {
      throw new Error("usePool must be used within its corresponding PoolProvider");
    }
    return context;
  };

  return { PoolProvider, usePool, Context };
}
