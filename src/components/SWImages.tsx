// WorkerContext.tsx
import { Remote } from "comlink";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

import type { ImageWorkerApiType } from "@/lib/ImagesWorker/ImagesWorker.ww";
import * as Comlink from "comlink";

export type WorkerApi = {
  [Comlink.releaseProxy]: () => void;
} & ImageWorkerApiType;

export const newImagesWorkerInstance = () => {
  const workerInstance = new Worker(new URL("@/lib/ImagesWorker/ImagesWorker.ww.ts", import.meta.url));
  const api = Comlink.wrap<WorkerApi>(workerInstance);
  return { api, worker: workerInstance };
};
type WorkerContextType = WorkerApi;

// Create the context
const WorkerContext = createContext<WorkerContextType | undefined>(undefined);

// <WorkspaceProvider>
// </WorkspaceProvider>

// Create the provider component
export const ImagesWorkerContextProvider = ({ children }: { children: ReactNode }) => {
  const [instance, setInstance] = useState<{ api: Remote<WorkerApi>; worker: Worker }>();

  useEffect(() => {
    const workerInstance = newImagesWorkerInstance();
    setInstance(workerInstance);

    return () => {
      workerInstance.worker.terminate();
    };
  }, []);

  return <WorkerContext.Provider value={instance?.api}>{children}</WorkerContext.Provider>;
};

// Hook to use the worker context
export const useImagesWorkerContext = (): WorkerContextType => {
  const context = useContext(WorkerContext);
  if (context === undefined) {
    throw new Error("useWorkerContext must be used within a WorkerContextProvider");
  }
  return context;
};
