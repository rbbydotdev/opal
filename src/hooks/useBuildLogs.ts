import { useCallback, useState } from "react";

export interface BuildLog {
  timestamp: Date;
  message: string;
  type: "info" | "error";
}

export function useBuildLogs() {
  const [logs, setLogs] = useState<BuildLog[]>([]);

  const addLog = useCallback((message: string, type: "info" | "error" = "info") => {
    setLogs((prev) => [...prev, { timestamp: new Date(), message, type }]);
  }, []);
  const log = addLog; // alias
  const errorLog = useCallback((message: string) => {
    setLogs((prev) => [...prev, { timestamp: new Date(), message, type: "error" }]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const formatTimestamp = useCallback((timestamp: Date) => {
    return timestamp.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, []);

  return {
    logs,
    log,
    errorLog,
    addLog,
    clearLogs,
    formatTimestamp,
  };
}
