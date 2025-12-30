import {
  ExtCtxNotReadyContext,
  ExtCtxReadyContext,
  WindowManager,
} from "@/features/live-preview/IframeContextProvider";
import { useWorkspaceContext } from "@/workspace/WorkspaceContext";
import React, { createContext, useEffect, useMemo } from "react";
import { useSnapshot } from "valtio";

export const WindowContext = createContext<WindowContextValue | null>(null);
// React Context for shared WindowManager
type WindowContextValue = (ExtCtxReadyContext | ExtCtxNotReadyContext) & {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

export function WindowContextProviderComponent({ children }: { children: React.ReactNode }) {
  const { currentWorkspace } = useWorkspaceContext();
  const contextProvider = useMemo(
    () => new WindowManager({ workspaceName: currentWorkspace.name }),
    [currentWorkspace.name]
  );
  // Use snapshots to trigger re-renders
  useSnapshot(contextProvider.state);
  useSnapshot(contextProvider.openState);

  useEffect(() => {
    return () => contextProvider.teardown();
  }, [contextProvider]);

  const value: WindowContextValue = useMemo(
    () => ({
      ...contextProvider.state.context,
      isOpen: contextProvider.openState.isOpen,
      open: () => contextProvider.open(),
      close: () => contextProvider.close(),
    }),
    [contextProvider]
  );

  return <WindowContext.Provider value={value}>{children}</WindowContext.Provider>;
}
