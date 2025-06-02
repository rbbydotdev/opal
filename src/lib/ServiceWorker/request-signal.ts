const START = "request-start" as const;
const END = "request-end" as const;

export const REQ_SIGNAL = {
  START,
  END,
};

export type ReqSignal = (typeof REQ_SIGNAL)[keyof typeof REQ_SIGNAL];
