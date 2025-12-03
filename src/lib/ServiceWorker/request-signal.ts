const START = "REQUEST_START" as const;
const END = "REQUEST_END" as const;
const COUNT = "REQUEST_COUNT" as const;

export const REQ_SIGNAL = {
  START,
  END,
  COUNT,
};

export const REQ_NAME = "REQUEST_SIGNAL" as const;

export type ReqSignal = (typeof REQ_SIGNAL)[keyof typeof REQ_SIGNAL];
