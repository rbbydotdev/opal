import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer } from "lucide-react";
import { createContext, useContext, ReactNode, useState } from "react";

interface LivePreviewDialogContextType {
  showDialog: (show: boolean) => void;
}

const LivePreviewDialogContext = createContext<LivePreviewDialogContextType | undefined>(undefined);

interface LivePreviewDialogProviderProps {
  children: ReactNode;
}

export function LivePreviewDialogProvider({ children }: LivePreviewDialogProviderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const showDialog = (show: boolean) => {
    setIsDialogOpen(show);
  };

  return (
    <LivePreviewDialogContext.Provider value={{ showDialog }}>
      {children}
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
    throw new Error('useLivePreviewDialog must be used within a LivePreviewDialogProvider');
  }
  return context;
}