"use client";
import { REQ_SIGNAL } from "@/lib/ServiceWorker/request-signal";
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";

type PendingRequestsContextType = {
  pendingCount: number;
  loadingDebounce: boolean;
};

const PendingRequestsContext = createContext<PendingRequestsContextType>({
  pendingCount: 0,
  loadingDebounce: false,
});

export const usePendingRequests = () => useContext(PendingRequestsContext);

type Props = {
  children: ReactNode;
};

const DEBOUNCE_DELAY = 500; // ms

export const PendingRequestsProvider: React.FC<Props> = ({ children }) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [loadingDebounce, setLoadingDebounce] = useState(false);

  // Use refs to avoid unnecessary re-renders
  const pendingCountRef = useRef(0);
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only update state if value actually changes
  const updatePendingCount = (newCount: number) => {
    if (pendingCountRef.current !== newCount) {
      pendingCountRef.current = newCount;
      setPendingCount(newCount);
    }
  };

  // Handler with debounce logic
  const handleRequestSignal = (type: string) => {
    let newCount = pendingCountRef.current;
    if (type === REQ_SIGNAL.START) {
      newCount += 1;
    } else if (type === REQ_SIGNAL.END) {
      newCount = Math.max(0, newCount - 1);
    }
    updatePendingCount(newCount);

    // Debounce logic
    if (newCount > 0) {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
        debounceTimeout.current = null;
      }
      if (!loadingDebounce) setLoadingDebounce(true);
    } else {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      debounceTimeout.current = setTimeout(() => {
        setLoadingDebounce(false);
      }, DEBOUNCE_DELAY);
    }
  };

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type === REQ_SIGNAL.START || event.data?.type === REQ_SIGNAL.END) {
        handleRequestSignal(event.data.type);
      }
    };

    function addHandlerIfControlled() {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.addEventListener("message", handler);
      }
    }

    void navigator.serviceWorker.ready.then(addHandlerIfControlled);
    navigator.serviceWorker.addEventListener("controllerchange", addHandlerIfControlled);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handler);
      navigator.serviceWorker.removeEventListener("controllerchange", addHandlerIfControlled);
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
    // eslint-disable-next-line
  }, [loadingDebounce]); // loadingDebounce is used in handleRequestSignal

  return (
    <PendingRequestsContext.Provider value={{ pendingCount, loadingDebounce }}>
      {children}
    </PendingRequestsContext.Provider>
  );
};
