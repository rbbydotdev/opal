const NOOPS = {
  log: () => {},
  debug: () => {},
  error: () => {},
  warn: () => {},
};
declare const __ENABLE_LOG__: boolean;
declare const __LOG_LEVEL__: "debug" | "log" | "warn" | "error";
export function initializeGlobalLogger(
  logger: {
    log: (...msg: unknown[]) => void;
    debug: (...msg: unknown[]) => void;
    error: (...msg: unknown[]) => void;
    warn: (...msg: unknown[]) => void;
  } = console
) {
  const levelPriority = {
    debug: 1,
    log: 2,
    warn: 3,
    error: 4,
  };

  const currentLevel = __LOG_LEVEL__;
  const shouldLog = (level: keyof typeof levelPriority) => levelPriority[level] >= levelPriority[currentLevel];

  (globalThis as any).logger = __ENABLE_LOG__
    ? {
        log: (...msg: unknown[]) => (shouldLog("log") ? logger.log(...msg) : undefined),
        debug: (...msg: unknown[]) => (shouldLog("debug") ? logger.debug(...msg) : undefined),
        error: (...msg: unknown[]) => (shouldLog("error") ? logger.error(...msg) : undefined),
        warn: (...msg: unknown[]) => (shouldLog("warn") ? logger.warn(...msg) : undefined),
      }
    : NOOPS;

  return logger;
}
