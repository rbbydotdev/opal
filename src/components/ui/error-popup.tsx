import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEscapeKeyClose } from "@/hooks/useEscapeKeyClose";
import { AlertCircle } from "lucide-react";
import * as React from "react";

// Types
interface ErrorPopupProps {
  title?: string;
  description?: string;
  onExit?: () => void;
}

type ErrorPopupActionType = {
  show: (props: ErrorPopupProps) => void;
  hide: () => void;
};

// Create context
const ErrorPopupContext = React.createContext<ErrorPopupActionType | null>(null);

function ErrorPopupProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    onExit?: () => void;
  }>({
    open: false,
    title: "An error occurred",
    description: "Something went wrong. Please try again later.",
    onExit: undefined,
  });

  const errorPopup = React.useMemo(
    () => ({
      show: ({
        title = "An error occurred",
        description = "Something went wrong. Please try again later.",
        onExit: onExit,
      }: ErrorPopupProps) => {
        setState({
          open: true,
          title,
          description,
          onExit: onExit,
        });
      },
      hide: () => setState((prev) => ({ ...prev, open: false })),
    }),
    []
  );

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      state.onExit?.();
    }
    setState((prev) => ({ ...prev, open }));
  };

  useEscapeKeyClose(state.open, ErrorPopupControl.hide);

  const handleExit = () => {
    state.onExit?.();
    handleOpenChange(false);
  };

  return (
    <ErrorPopupContext.Provider value={errorPopup}>
      {children}
      <ErrorDialog
        open={state.open}
        title={state.title}
        description={state.description}
        handleOpenChange={handleOpenChange}
        handleExit={handleExit}
      />
    </ErrorPopupContext.Provider>
  );
}

// Hook to use the error popup
const useErrorPopup = () => {
  const context = React.useContext(ErrorPopupContext);

  if (!context) {
    throw new Error("useErrorPopup must be used within an ErrorPopupProvider");
  }

  return context;
};

// Create a global instance for imperative calls
let errorPopupInstance: ErrorPopupActionType | null = null;

export const ErrorPopupControl = {
  show: (props: ErrorPopupProps) => {
    if (errorPopupInstance) {
      errorPopupInstance.show(props);
    } else {
      console.warn("ErrorPopupProvider not mounted yet");
    }
  },
  hide: () => {
    if (errorPopupInstance) {
      errorPopupInstance.hide();
    }
  },
  setInstance: (instance: ErrorPopupActionType) => {
    errorPopupInstance = instance;
  },
};

function ShowErrorDialog({
  title,
  description,
  handleExit,
}: {
  title: string;
  description: string;
  handleExit?: () => void;
}) {
  const [open, setOpen] = React.useState(true);
  return (
    <ErrorDialog
      open={open}
      title={title}
      description={description}
      handleOpenChange={setOpen}
      handleExit={handleExit}
    />
  );
}

function ErrorDialog({
  open,
  title,
  description,
  handleOpenChange,
  handleExit,
}: {
  open: boolean;
  title: string;
  description: string;
  handleOpenChange: (open: boolean) => void;
  handleExit?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-2 border-destructive sm:max-w-md">
        <DialogHeader className="flex flex-row items-center gap-2 text-destructive">
          <AlertCircle className="h-6 w-6" />
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-base">{description}</DialogDescription>
        <DialogFooter>
          {/* <Button onClick={handleConfirm} className="w-full bg-red-600 hover:bg-red-700 text-white"> */}
          <Button variant="destructive" className="w-full" onClick={handleExit}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Component to register the instance
function ErrorPopupInstanceSetter() {
  const instance = useErrorPopup();

  React.useEffect(() => {
    ErrorPopupControl.setInstance(instance);
    return () => {
      errorPopupInstance = null;
    };
  }, [instance]);

  return null;
}

export function ErrorPopper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorPopupProvider>
      <ErrorPopupInstanceSetter />
      {children}
    </ErrorPopupProvider>
  );
}
