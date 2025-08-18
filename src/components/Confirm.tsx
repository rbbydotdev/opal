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
  open: <U extends () => unknown>(cb: U, title: string, description: string) => Promise<ReturnType<U>>;
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

function useConfirmCmd() {
  const cmdRef = useRef<{
    open: <U extends () => unknown>(cb: U, title: string, description: string) => Promise<ReturnType<U>>;
  }>({
    open: async () => undefined as any,
  });
  return {
    open: <U extends () => unknown>(cb: U, title: string, description: string) =>
      cmdRef.current.open(cb, title, description),
    cmdRef,
  };
}

export function Confirm({
  cmdRef,
}: {
  cmdRef: React.ForwardedRef<{
    open: (cb: <T>() => T, title: string, description: string) => void;
  }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const deferredPromiseRef = useRef<PromiseWithResolvers<unknown> | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<string>("");
  const openHandlerCb = useRef<((resolve: "ok" | "cancel") => Promise<unknown> | unknown) | null>(null);

  const handleCancel = async () => {
    await openHandlerCb.current?.("cancel");
    setIsOpen(false);
    openHandlerCb.current = null;
    deferredPromiseRef.current = null;
  };

  const handleSubmit = async () => {
    await openHandlerCb.current?.("ok");
    setIsOpen(false);
    openHandlerCb.current = null;
    deferredPromiseRef.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      void handleCancel();
    }
  };

  useEffect(() => {
    return () => {
      openHandlerCb.current = null;
      deferredPromiseRef.current = null;
    };
  }, []);

  useImperativeHandle(cmdRef, () => ({
    open: (cb: <T>() => T, title: string, description: string) => {
      deferredPromiseRef.current = Promise.withResolvers();
      setTitle(title);
      setDescription(description);
      setIsOpen(true);
      openHandlerCb.current = (okOrCancel) => {
        try {
          if (okOrCancel === "ok") {
            deferredPromiseRef.current?.resolve(cb());
          }
          if (okOrCancel === "cancel") {
            deferredPromiseRef.current?.resolve(null);
          }
        } catch (error) {
          deferredPromiseRef.current?.reject(error);
        }
      };
      return deferredPromiseRef.current.promise as Promise<ReturnType<typeof cb>>;
    },
  }));

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogTrigger asChild></AlertDialogTrigger>
      <AlertDialogContent onKeyDown={handleKeyDown}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {/<\/?[a-z][\s\S]*>/i.test(description) ? (
            <AlertDialogDescription className="[&_*]:leading-8" dangerouslySetInnerHTML={{ __html: description }} />
          ) : (
            <AlertDialogDescription className="[&_*]:leading-8">{description}</AlertDialogDescription>
          )}
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
