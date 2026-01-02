declare const __ENABLE_LOG__: boolean;
declare const __LOG_LEVEL__: "debug" | "log" | "warn" | "error";

export function initializeGlobalLogger(remoteLogger: {
  log: (...msg: unknown[]) => void;
  debug: (...msg: unknown[]) => void;
  error: (...msg: unknown[]) => void;
  warn: (...msg: unknown[]) => void;
}) {
  const levelPriority = {
    debug: 1,
    log: 2,
    warn: 3,
    error: 4,
  };

  const currentLevel = __LOG_LEVEL__;
  const shouldLog = (level: keyof typeof levelPriority) => levelPriority[level] >= levelPriority[currentLevel];

  for (const level of ["log", "debug", "error", "warn"] as const) {
    if (!__ENABLE_LOG__) {
      globalThis.console[level] = () => {};
      continue;
    }
    if (shouldLog(level)) {
      globalThis.console[level] = remoteLogger[level].bind(remoteLogger);
    }
  }

  return globalThis.console;
}
