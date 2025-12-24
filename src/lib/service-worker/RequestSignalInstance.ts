import { RequestSignals } from "@/lib/service-worker/RequestSignals";

let _reqSig: RequestSignals | null = null;

export const RequestSignalsInstance = new Proxy(
  {},
  {
    get(_, prop) {
      if (!_reqSig) {
        _reqSig = new RequestSignals();
      }

      return Reflect.get(_reqSig, prop);
    },
  }
) as RequestSignals;
