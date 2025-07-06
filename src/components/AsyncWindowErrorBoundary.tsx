"use client";
import { ErrorPlaque } from "@/components/ErrorPlaque";
import { useEscapeKeyClose } from "@/hooks/useEscapeKeyClose";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";

export const AsyncWindowErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [error, setError] = useState<Error | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const reset = () => {
    setError(null);
    setIsOpen(false);
  };

  const promiseRejectionHandler = (event: PromiseRejectionEvent) => {
    setError(event.reason);
    setIsOpen(true);
  };

  const pathname = usePathname();
  useEffect(() => {
    reset();
  }, [pathname, reset]);
  //close on keyboard escape key
  useEscapeKeyClose(isOpen, reset);

  useEffect(() => {
    window.addEventListener("unhandledrejection", promiseRejectionHandler);

    return () => {
      window.removeEventListener("unhandledrejection", promiseRejectionHandler);
    };
  }, [promiseRejectionHandler]);

  return error && isOpen ? <ErrorPlaque error={error} reset={reset} /> : children;
};
