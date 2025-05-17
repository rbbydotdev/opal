export const RemoteLogger = (_msg: string, type = "log") => {
  void fetch("http://localhost:8080", {
    method: "POST",
    body: JSON.stringify({
      msg: _msg,
      type,
    }),
    signal: AbortSignal.timeout(1000),
  }).catch(() => {});
};
