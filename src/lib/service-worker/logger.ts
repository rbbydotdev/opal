import { RemoteLoggerLogger } from "@/lib/service-worker/utils";

declare const __ENABLE_LOG__: boolean;
declare const __LOG_LEVEL__: "debug" | "log" | "warn" | "error";

// Create the base logger
const baseLogger = RemoteLoggerLogger("SW");

// Log level priority mapping
const levelPriority = {
  debug: 1,
  log: 2,
  warn: 3,
  error: 4,
};

const currentLevel = __LOG_LEVEL__;
const shouldLog = (level: keyof typeof levelPriority) =>
  __ENABLE_LOG__ && levelPriority[level] >= levelPriority[currentLevel];

// Centralized logger for all service worker files with level filtering
export const logger = {
  log: (...msg: unknown[]) => {
    if (shouldLog("log")) baseLogger.log(...msg);
  },
  debug: (...msg: unknown[]) => {
    if (shouldLog("debug")) baseLogger.debug(...msg);
  },
  error: (...msg: unknown[]) => {
    if (shouldLog("error")) baseLogger.error(...msg);
  },
  warn: (...msg: unknown[]) => {
    if (shouldLog("warn")) baseLogger.warn(...msg);
  },
};