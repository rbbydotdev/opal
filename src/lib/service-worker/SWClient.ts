import { mapToTypedError } from "@/lib/errors/errors";
import { SWAppType } from "@/lib/service-worker/sw-hono";
import { hc } from "hono/client";

let _swClient: ReturnType<typeof hc<SWAppType>> | null = null;

async function customFetch(...args: Parameters<typeof fetch>) {
  const res = await fetch(...args);
  if (!res.ok) {
    throw mapToTypedError({
      message: res.statusText,
      status: res.status,
    });
  }
  return res;
}

export const SWClient = new Proxy(
  {},
  {
    get(_, prop) {
      if (!_swClient) {
        _swClient = hc<SWAppType>(window.origin, {
          fetch: customFetch,
        });
      }

      return Reflect.get(_swClient, prop);
    },
  }
) as ReturnType<typeof hc<SWAppType>>;
