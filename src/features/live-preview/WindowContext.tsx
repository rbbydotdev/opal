import {
  ExtCtxNotReadyContext,
  ExtCtxReadyContext,
  WindowManager,
} from "@/features/live-preview/IframeContextProvider";
import { useWorkspaceContext } from "@/workspace/WorkspaceContext";
import React, { createContext, useEffect, useMemo, useSyncExternalStore } from "react";

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
  const context = useSyncExternalStore(contextProvider.onReady, contextProvider.getContext);
  const isOpen = useSyncExternalStore(contextProvider.onOpenChange, contextProvider.getOpenState);

  useEffect(() => {
    return () => contextProvider.teardown();
  }, [contextProvider]);

  const value: WindowContextValue = useMemo(
    () => ({
      ...context,
      isOpen,
      open: () => contextProvider.open(),
      close: () => contextProvider.close(),
    }),
    [context, isOpen, contextProvider]
  );

  return <WindowContext.Provider value={value}>{children}</WindowContext.Provider>;
}
