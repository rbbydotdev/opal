import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import React, { createContext, useContext, useEffect, useImperativeHandle, useRef, useState } from "react";

type ConfirmContextType = {
  open: (cb: () => void, title: string, description: string) => void;
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

export type ConfirmOpen = (cb: () => void, title: string, description: string) => void;
export function useConfirmCmd() {
  const cmdRef = useRef<{ open: ConfirmOpen }>({ open: () => {} });
  return {
    open: (cb: () => void, title: string, description: string) => cmdRef.current.open(cb, title, description),
    cmdRef,
  };
}

export function Confirm({
  cmdRef,
}: {
  cmdRef: React.ForwardedRef<{
    open: (cb: () => void, title: string, description: string) => void;
  }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const openHandlerCb = useRef<() => void | null>(null);

  const handleCancel = () => {
    setIsOpen(false);
    openHandlerCb.current = null;
  };

  const handleSubmit = () => {
    setIsOpen(false);
    openHandlerCb.current?.();
    openHandlerCb.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  useEffect(() => {
    return () => {
      openHandlerCb.current = null;
    };
  }, []);

  useImperativeHandle(cmdRef, () => ({
    open: (cb: () => void, title: string, description: string) => {
      setTitle(title);
      setDescription(description);
      setIsOpen(true);
      openHandlerCb.current = cb;
    },
  }));

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogTrigger asChild></AlertDialogTrigger>
      <AlertDialogContent onKeyDown={handleKeyDown}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} ref={(ref) => ref?.focus()}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit}>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
