import * as Comlink from "comlink";
import { transferHandlers } from "comlink";
transferHandlers.set("FUNCTION", {
  canHandle: (obj) => typeof obj === "function",
  serialize(obj) {
    const { port1, port2 } = new MessageChannel();
    Comlink.expose(obj, port1);
    return [port2, [port2]];
  },
  deserialize(port: MessagePort) {
    port.start();
    return Comlink.wrap(port);
  },
});
