export type RunnerLogLine = {
  timestamp: number;
  message: string;
  type: "info" | "error";
};

export type RunnerLogType = RunnerLogLine["type"];

export function createLogLine(message: string, type: RunnerLogType = "info"): RunnerLogLine {
  return {
    timestamp: Date.now(),
    message,
    type,
  };
}