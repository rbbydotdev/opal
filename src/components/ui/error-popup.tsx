"use client";

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
export interface ErrorPopupProps {
  title?: string;
  description?: string;
  onConfirm?: () => void;
}

type ErrorPopupActionType = {
  show: (props: ErrorPopupProps) => void;
  hide: () => void;
};

// Create context
const ErrorPopupContext = React.createContext<ErrorPopupActionType | null>(null);

export function ErrorPopupProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm?: () => void;
  }>({
    open: false,
    title: "An error occurred",
    description: "Something went wrong. Please try again later.",
    onConfirm: undefined,
  });

  const errorPopup = React.useMemo(
    () => ({
      show: ({
        title = "An error occurred",
        description = "Something went wrong. Please try again later.",
        onConfirm,
      }: ErrorPopupProps) => {
        setState({
          open: true,
          title,
          description,
          onConfirm,
        });
      },
      hide: () => setState((prev) => ({ ...prev, open: false })),
    }),
    []
  );

  const handleOpenChange = (open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  };

  useEscapeKeyClose(state.open, ErrorPopupControl.hide);

  const handleConfirm = () => {
    state.onConfirm?.();
    handleOpenChange(false);
  };

  return (
    <ErrorPopupContext.Provider value={errorPopup}>
      {children}
      <Dialog open={state.open} onOpenChange={handleOpenChange}>
        <DialogContent className="border-2 border-red-500 sm:max-w-md">
          <DialogHeader className="flex flex-row items-center gap-2 text-red-600">
            <AlertCircle className="h-6 w-6" />
            <DialogTitle>{state.title}</DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-base">{state.description}</DialogDescription>
          <DialogFooter>
            {/* <Button onClick={handleConfirm} className="w-full bg-red-600 hover:bg-red-700 text-white"> */}
            <Button variant="destructive" className="w-full" onClick={handleConfirm}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ErrorPopupContext.Provider>
  );
}

// Hook to use the error popup
export const useErrorPopup = () => {
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

// Component to register the instance
export function ErrorPopupInstanceSetter() {
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
