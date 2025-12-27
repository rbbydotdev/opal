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
        log: shouldLog("log") ? logger.log.bind(logger) : NOOPS.log,
        debug: shouldLog("debug") ? logger.debug.bind(logger) : NOOPS.debug,
        error: shouldLog("error") ? logger.error.bind(logger) : NOOPS.error,
        warn: shouldLog("warn") ? logger.warn.bind(logger) : NOOPS.warn,
      }
    : NOOPS;

  return __ENABLE_LOG__ ? logger : NOOPS;
}
