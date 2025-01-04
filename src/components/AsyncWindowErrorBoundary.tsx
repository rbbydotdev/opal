"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePathname } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

export const AsyncWindowErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [error, setError] = useState<Error | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const reset = useCallback(() => {
    setError(null);
    setIsOpen(false);
  }, []);

  const promiseRejectionHandler = useCallback((event: PromiseRejectionEvent) => {
    setError(event.reason);
    setIsOpen(true);
  }, []);

  const pathname = usePathname();
  useEffect(() => {
    reset();
  }, [pathname, reset]);

  useEffect(() => {
    window.addEventListener("unhandledrejection", promiseRejectionHandler);

    return () => {
      window.removeEventListener("unhandledrejection", promiseRejectionHandler);
    };
  }, [promiseRejectionHandler]);

  return error && isOpen ? (
    <div className="w-full">
      <div className="relative flex justify-center items-center h-full w-full">
        <Card className=" max-w-2xl max-h-[32rem] flex flex-col border-2 border-destructive shadow-lg">
          <CardHeader className="flex-grow">
            <CardTitle>Error</CardTitle>
            <CardDescription>Something went wrong...</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow card-content min-h-0 flex flex-col">
            {/* <CardContent className="flex flex-col flex-grow"> */}
            <CardDescription className="font-mono flex-grow flex flex-col min-h-0 ">
              <div className="flex flex-grow flex-col min-h-0">
                <div className="flex flex-col gap-4 font-bold pb-4 ">
                  <p>{error.message}</p>
                  <p>{error.name}</p>
                  <p>{error.toString()}</p>
                </div>
                <div className="overflow-auto flex-grow">
                  <p>{error.stack}</p>
                </div>
              </div>
            </CardDescription>
            <Button variant="outline" className="mt-4 self-center" onClick={reset}>
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  ) : (
    children
  );
};
