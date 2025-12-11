import { OmniBusEmitter } from "@/lib/events/TypeEmitter";

let _omniBus: OmniBusEmitter | null = null;

export const OmniBus = new Proxy(
  {},
  {
    get(_, prop) {
      if (!_omniBus) {
        _omniBus = new OmniBusEmitter();
      }

      return Reflect.get(_omniBus, prop);
    },
  }
) as OmniBusEmitter;
