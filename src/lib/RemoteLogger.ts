export type LogTransport = "net" | "postMsg" | "net+postMsg";

export const RemoteLogger =
  (name: string, transport: LogTransport = "postMsg") =>
  (_msg: string, type = "log") => {
    const logData = {
      msg: `{${name}}: ${_msg}`,
      type,
    };

    if (transport === "net" || transport === "net+postMsg") {
      void fetch("http://localhost:8080", {
        method: "POST",
        body: JSON.stringify(logData),
        signal: AbortSignal.timeout(1000),
      }).catch(() => {});
    }

    if (transport === "postMsg" || transport === "net+postMsg") {
      // Post message to all clients (for service worker context)
      if (typeof self !== "undefined" && "clients" in self) {
        const swSelf = self as any;
        void swSelf.clients.matchAll().then((clients: any) => {
          clients.forEach((client: any) => {
            client.postMessage({
              type: "SW_LOG",
              data: logData,
            });
          });
        });
      }
      // Post message to parent (for regular worker context)
      else if (typeof self !== "undefined" && "postMessage" in self) {
        (self as any).postMessage({
          type: "SW_LOG",
          data: logData,
        });
      }
    }
  };
