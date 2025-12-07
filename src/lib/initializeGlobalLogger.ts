export function initializeGlobalLogger(logger: {
  log: (...msg: unknown[]) => void;
  debug: (...msg: unknown[]) => void;
  error: (...msg: unknown[]) => void;
  warn: (...msg: unknown[]) => void;
}) {
  (globalThis as any).logger = logger;
  return logger;
}
