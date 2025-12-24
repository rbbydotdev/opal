import { REQ_NAME, RequestEventDetail } from "@/lib/service-worker/request-signal-types";

// Strongly-typed CustomEvent for request signals

export class RequestEvent extends CustomEvent<RequestEventDetail> {
  constructor(detail: RequestEventDetail) {
    super(REQ_NAME, { detail });
  }
}
