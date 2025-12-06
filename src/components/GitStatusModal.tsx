import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "lucide-react";
import React, { createContext, useEffect, useImperativeHandle, useRef, useState } from "react";

type GitStatusContextType = {
  open: (options?: { onCancel?: () => void }) => Promise<"cancelled" | "completed">;
  close: () => void;
};

const GitStatusContext = createContext<GitStatusContextType | undefined>(undefined);

export function GitStatusProvider({ children }: { children: React.ReactNode }) {
  const { open, close, cmdRef } = useGitStatusCmd();

  return (
    <GitStatusContext.Provider value={{ open, close }}>
      {children}
      <GitStatusModal cmdRef={cmdRef} />
    </GitStatusContext.Provider>
  );
}

function useGitStatusCmd() {
  const cmdRef = useRef<{
    open: (options?: { onCancel?: () => void }) => Promise<"cancelled" | "completed">;
    close: () => void;
  }>({
    open: async () => "completed" as const,
    close: () => {},
  });

  return {
    open: (options?: { onCancel?: () => void }) => cmdRef.current.open(options),
    close: () => cmdRef.current.close(),
    cmdRef,
  };
}

function GitStatusModal({
  cmdRef,
}: {
  cmdRef: React.ForwardedRef<{
    open: (options?: { onCancel?: () => void }) => Promise<"cancelled" | "completed">;
    close: () => void;
  }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const deferredPromiseRef = useRef<PromiseWithResolvers<"cancelled" | "completed"> | null>(null);
  const onCancelRef = useRef<(() => void) | undefined>(undefined);

  const handleCancel = async () => {
    onCancelRef.current?.();
    setIsOpen(false);
    deferredPromiseRef.current?.resolve("cancelled");
    deferredPromiseRef.current = null;
    onCancelRef.current = undefined;
  };

  const handleClose = () => {
    setIsOpen(false);
    deferredPromiseRef.current?.resolve("completed");
    deferredPromiseRef.current = null;
    onCancelRef.current = undefined;
  };

  // Prevent escape key and outside clicks
  const handleEscapeKeyDown = (e: KeyboardEvent) => {
    e.preventDefault();
  };

  const handleInteractOutside = (e: Event) => {
    e.preventDefault();
  };

  useEffect(() => {
    return () => {
      deferredPromiseRef.current = null;
      onCancelRef.current = undefined;
    };
  }, []);

  useImperativeHandle(cmdRef, () => ({
    open: (options?: { onCancel?: () => void }) => {
      deferredPromiseRef.current = Promise.withResolvers();
      onCancelRef.current = options?.onCancel;
      setIsOpen(true);
      return deferredPromiseRef.current.promise;
    },
    close: handleClose,
  }));

  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onEscapeKeyDown={handleEscapeKeyDown}
        onInteractOutside={handleInteractOutside}
      >
        <DialogHeader className="text-center">
          <DialogTitle className="flex items-center justify-center gap-3">
            <Loader className="h-5 w-5 animate-spin" />
            DOING CHANGES
          </DialogTitle>
          <DialogDescription>WORKING...</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
