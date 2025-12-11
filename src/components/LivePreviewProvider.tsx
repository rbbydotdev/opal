import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WindowPreviewComponent, WindowPreviewHandler } from "@/features/live-preview/PreviewComponent";
import { useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { Printer } from "lucide-react";
import { createContext, ReactNode, useContext, useRef, useState } from "react";

interface LivePreviewDialogContextType {
  showDialog: (show: boolean) => void;
  extPreviewCtrl: React.RefObject<WindowPreviewHandler | null>;
  onRenderBodyReadyRef: React.MutableRefObject<
    ((el: HTMLElement, context: { document: Document; window: Window; ready: true }) => void) | null
  >;
}

const LivePreviewDialogContext = createContext<LivePreviewDialogContextType | undefined>(undefined);

interface LivePreviewDialogProviderProps {
  children: ReactNode;
}

export function LivePreviewDialogProvider({ children }: LivePreviewDialogProviderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { path } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();
  const extPreviewCtrl = useRef<WindowPreviewHandler | null>(null);
  const onRenderBodyReadyRef = useRef<
    ((el: HTMLElement, context: { document: Document; window: Window; ready: true }) => void) | null
  >(null);

  const showDialog = (show: boolean) => {
    setIsDialogOpen(show);
  };

  const handleRenderBodyReady = (el: HTMLElement, context: { document: Document; window: Window; ready: true }) => {
    if (onRenderBodyReadyRef.current) {
      onRenderBodyReadyRef.current(el, context);
    }
  };

  return (
    <LivePreviewDialogContext.Provider value={{ showDialog, extPreviewCtrl, onRenderBodyReadyRef }}>
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
