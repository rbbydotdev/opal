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
import React, { useEffect, useImperativeHandle, useRef, useState } from "react";

export function useConfirmCmd() {
  const cmdRef = useRef<{
    open: <U extends () => unknown>(
      cb: U,
      title: React.ReactNode,
      description: React.ReactNode
    ) => Promise<ReturnType<U>>;
  }>({
    open: async () => undefined as any,
  });
  return {
    open: <U extends () => unknown>(cb: U, title: React.ReactNode, description: React.ReactNode) =>
      cmdRef.current.open(cb, title, description),
    cmdRef,
  };
}

export function Confirm({
  cmdRef,
}: {
  cmdRef: React.ForwardedRef<{
    open: (cb: <T>() => T, title: React.ReactNode, description: React.ReactNode) => void;
  }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const deferredPromiseRef = useRef<PromiseWithResolvers<unknown> | null>(null);
  const [title, setTitle] = useState<React.ReactNode>(null);
  const [description, setDescription] = useState<React.ReactNode>();
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
    open: (cb: <T>() => T, title: React.ReactNode, description: React.ReactNode) => {
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
          <AlertDialogDescription className="[&_*]:leading-8">{description}</AlertDialogDescription>
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
