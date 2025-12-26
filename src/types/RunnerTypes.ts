export type RunnerLogType = LogLine["type"];

export function createLogLine(message: string, type: RunnerLogType = "info"): LogLine {
  return {
    timestamp: Date.now(),
    message,
    type,
  };
}

export type LogLine = {
  type: "info" | "error" | "warning" | "success";
  timestamp: number;
  message: string;
};
