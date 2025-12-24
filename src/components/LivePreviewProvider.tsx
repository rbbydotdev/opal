import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWindowContextProvider } from "@/features/live-preview/IframeContextProvider";
import { WindowPreviewComponent, WindowPreviewHandler } from "@/features/live-preview/PreviewComponent";
import { useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { Printer } from "lucide-react";
import { createContext, ReactNode, useContext, useRef, useState } from "react";

interface LivePreviewDialogContextType {
  showDialog: (show: boolean) => void;
  extPreviewCtrl: React.RefObject<WindowPreviewHandler | null>;
  open: (params?: { print: boolean }) => void;
  close: () => void;
}

const LivePreviewDialogContext = createContext<LivePreviewDialogContextType | undefined>(undefined);

interface LivePreviewDialogProviderProps {
  children: ReactNode;
}

export function LivePreviewDialogProvider({ children }: LivePreviewDialogProviderProps) {
  const [isDialogOpen, showDialog] = useState(false);
  const { path } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();
  const shouldPrintRef = useRef(false);

  const context = useWindowContextProvider();
  const extPreviewCtrl = useRef<WindowPreviewHandler | null>(null);
  const open = ({ print }: { print?: boolean } = {}) => {
    if (extPreviewCtrl.current) {
      shouldPrintRef.current = print ?? false;
      extPreviewCtrl.current.open();
    }
  };
  const close = () => {
    if (extPreviewCtrl.current) {
      extPreviewCtrl.current.close();
    }
  };

  const handleRenderBodyReady = () => {
    if (!context.window) return;
    if (!shouldPrintRef.current) return;
    shouldPrintRef.current = false;
    context.window.addEventListener("afterprint", () => context.window.close());
    context.window.print();
    setTimeout(() => {
      showDialog(false);
    }, 0);
  };

  return (
    <LivePreviewDialogContext.Provider value={{ showDialog, extPreviewCtrl, open, close }}>
      {children}
      <WindowPreviewComponent
        path={path!}
        ref={extPreviewCtrl}
        currentWorkspace={currentWorkspace}
        onRenderBodyReady={handleRenderBodyReady}
      />
      <Dialog open={isDialogOpen}>
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
    </LivePreviewDialogContext.Provider>
  );
}

export function useLivePreviewDialog() {
  const context = useContext(LivePreviewDialogContext);
  if (context === undefined) {
    throw new Error("useLivePreviewDialog must be used within a LivePreviewDialogProvider");
  }
  return context;
}
