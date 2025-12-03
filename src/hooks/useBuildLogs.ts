import { useCallback, useState } from "react";

export interface BuildLog {
  timestamp: number;
  message: string;
  type: "info" | "error";
}

function useBuildLogs() {
  const [logs, setLogs] = useState<BuildLog[]>([]);

  const addLog = useCallback((message: string, type: "info" | "error" = "info") => {
    setLogs((prev) => [...prev, { timestamp: Date.now(), message, type }]);
  }, []);
  const log = addLog; // alias
  const errorLog = useCallback((message: string) => {
    setLogs((prev) => [...prev, { timestamp: Date.now(), message, type: "error" }]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    logs,
    log,
    errorLog,
    addLog,
    clearLogs,
  };
}
