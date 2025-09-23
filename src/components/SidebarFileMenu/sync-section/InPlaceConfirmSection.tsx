import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useImperativeHandle, useRef, useState } from "react";

// const { open: openConfirmPane, cmdRef: confirmPaneRef } = useInPlaceConfirmCmd();
export function InPlaceConfirmSection({
  cmdRef,
}: {
  cmdRef: React.ForwardedRef<{
    open: <U extends () => unknown>(
      message: string,
      cb?: U,
      options?: {
        variant?: "destructive" | "default";
        confirmText?: string;
        cancelText?: string;
      }
    ) => Promise<ReturnType<U> | null>;
  }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [variant, setVariant] = useState<"destructive" | "default">("destructive");
  const [confirmText, setConfirmText] = useState("OK");
  const [cancelText, setCancelText] = useState("Cancel");
  const deferredPromiseRef = useRef<PromiseWithResolvers<unknown> | null>(null);
  const openHandlerCb = useRef<((resolve: "ok" | "cancel") => Promise<unknown> | unknown) | null>(null);

  const handleCancel = async () => {
    await openHandlerCb.current?.("cancel");
    setIsOpen(false);
    openHandlerCb.current = null;
    deferredPromiseRef.current = null;
  };

  const handleConfirm = async () => {
    await openHandlerCb.current?.("ok");
    setIsOpen(false);
    openHandlerCb.current = null;
    deferredPromiseRef.current = null;
  };

  useEffect(() => {
    return () => {
      openHandlerCb.current = null;
      deferredPromiseRef.current = null;
    };
  }, []);

  useImperativeHandle(cmdRef, () => ({
    open: <U extends () => unknown>(
      message: string,
      cb?: U,
      options?: {
        variant?: "destructive" | "default";
        confirmText?: string;
        cancelText?: string;
      }
    ) => {
      deferredPromiseRef.current = Promise.withResolvers();
      setMessage(message);
      setVariant(options?.variant || "destructive");
      setConfirmText(options?.confirmText || "OK");
      setCancelText(options?.cancelText || "Cancel");
      setIsOpen(true);
      openHandlerCb.current = (okOrCancel) => {
        try {
          if (okOrCancel === "ok") {
            deferredPromiseRef.current?.resolve(cb ? cb() : null);
          }
          if (okOrCancel === "cancel") {
            deferredPromiseRef.current?.resolve(null);
          }
        } catch (error) {
          deferredPromiseRef.current?.reject(error);
        }
      };
      // Use NonNullable to ensure a function type when deriving ReturnType
      return deferredPromiseRef.current.promise as Promise<ReturnType<NonNullable<typeof cb>> | null>;
    },
  }));

  if (!isOpen) return null;

  return (
    <div
      className={cn("w-full border p-4 rounded-lg gap-4 flex flex-wrap justify-center items-center", {
        "border-destructive": variant === "destructive",
        "border-border": variant === "default",
      })}
    >
      <div className="text-2xs mb-2 uppercase min-w-[50%]">{message}</div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={handleCancel}>
          {cancelText}
        </Button>
        <Button size="sm" variant={variant} onClick={handleConfirm}>
          {confirmText}
        </Button>
      </div>
    </div>
  );
}
