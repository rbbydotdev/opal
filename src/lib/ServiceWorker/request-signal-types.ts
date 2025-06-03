// Shared between main thread and service worker

export const REQ_NAME = "request-signal" as const;

export const REQ_SIGNAL = {
  START: "start",
  END: "end",
  COUNT: "count",
} as const;

export type ReqSignal = (typeof REQ_SIGNAL)[keyof typeof REQ_SIGNAL];

export type RequestEventDetail =
  | { type: typeof REQ_SIGNAL.START }
  | { type: typeof REQ_SIGNAL.END }
  | { type: typeof REQ_SIGNAL.COUNT; count: number };
