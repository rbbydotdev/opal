export const RemoteLogger =
  (name: string) =>
  (_msg: string, type = "log") => {
    void fetch("http://localhost:8080", {
      method: "POST",
      body: JSON.stringify({
        msg: `{${name}}: ${_msg}`,
        type,
      }),
      signal: AbortSignal.timeout(1000),
    }).catch(() => {});
  };
