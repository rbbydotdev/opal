import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWindowContextProvider } from "@/features/live-preview/IframeContextProvider";
import { WindowPreviewComponent, WindowPreviewHandler } from "@/features/live-preview/PreviewComponent";
import { useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import EventEmitter from "events";
import { Printer } from "lucide-react";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

interface LivePreviewContextType {
  showDialog: (show: boolean) => void;
  extPreviewCtrl: React.RefObject<WindowPreviewHandler | null>;
  open: (params?: { print: boolean }) => void;
  close: () => void;
}

const LivePreviewContext = createContext<LivePreviewContextType | undefined>(undefined);

interface LivePreviewProviderProps {
  children: ReactNode;
}

export function LivePreviewProvider({ children }: LivePreviewProviderProps) {
  const [isDialogOpen, showDialog] = useState(false);
  const { path } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();
  const emitter = useMemo(() => new EventEmitter(), []);
  useEffect(() => {
    return () => {
      emitter.removeAllListeners();
    };
  }, [emitter]);

  const context = useWindowContextProvider();
  const extPreviewCtrl = useRef<WindowPreviewHandler | null>(null);

  const handleRenderBodyReady = useCallback(() => {
    if (!context.window) return;
    context.window.addEventListener("afterprint", () => context.window.close());
    queueMicrotask(() => showDialog(false)); //hides in firefox because firefox does not lock main thread
    setTimeout(() => context.window.print(), 500);
  }, [context.window]);

  const open = useCallback(
    async ({ print }: { print?: boolean } = {}) => {
      if (extPreviewCtrl.current) {
        extPreviewCtrl.current.open();
        if (print) {
          await emitter.once("render-body-ready", () => handleRenderBodyReady);
        }
      }
    },
    [emitter, handleRenderBodyReady]
  );
  const close = useCallback(() => {
    if (extPreviewCtrl.current) {
      extPreviewCtrl.current.close();
    }
  }, []);

  return (
    <LivePreviewContext.Provider value={{ showDialog, extPreviewCtrl, open, close }}>
      {children}
      <WindowPreviewComponent
        path={path!}
        ref={extPreviewCtrl}
        currentWorkspace={currentWorkspace}
        onRenderBodyReady={handleRenderBodyReady}
      />
      <Dialog open={isDialogOpen} onOpenChange={showDialog}>
        <DialogContent>
          <DialogTitle className="sr-only">Print Dialog Open</DialogTitle>
          <DialogHeader className="flex justify-center items-center">
            <Printer className="mx-auto mb-4 w-12 h-12 text-primary" />
            <h3 className="text-lg font-semibold mb-2">Print Dialog Open</h3>
          </DialogHeader>
          <div className="text-center">
            <p className="mb-4">Close the print dialog in the preview window to continue using the editor.</p>
          </div>
        </DialogContent>
      </Dialog>
    </LivePreviewContext.Provider>
  );
}

export function useLivePreviewDialog() {
  const context = useContext(LivePreviewContext);
  if (context === undefined) {
    throw new Error("useLivePreviewDialog must be used within a LivePreviewDialogProvider");
  }
  return context;
}
