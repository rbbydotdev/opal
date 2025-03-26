// WorkerContext.tsx
import { newWorkerInstance, WorkerApi } from "@/lib/ImagesWorker/ImagesWorkerApi";
import { Remote } from "comlink";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

// Define the context type
type WorkerContextType = WorkerApi;

// Create the context
const WorkerContext = createContext<WorkerContextType | undefined>(undefined);

// Create the provider component
export const WorkerContextProvider = ({ children }: { children: ReactNode }) => {
  const [instance, setInstance] = useState<{ api: Remote<WorkerApi>; worker: Worker }>();

  useEffect(() => {
    const workerInstance = newWorkerInstance();
    setInstance(workerInstance);

    return () => {
      workerInstance.worker.terminate();
    };
  }, []);

  return <WorkerContext.Provider value={instance?.api}>{children}</WorkerContext.Provider>;
};

// Hook to use the worker context
export const useWorkerContext = (): WorkerContextType => {
  const context = useContext(WorkerContext);
  if (context === undefined) {
    throw new Error("useWorkerContext must be used within a WorkerContextProvider");
  }
  return context;
};
