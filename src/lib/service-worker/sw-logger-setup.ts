export function setupServiceWorkerLogger() {
  if (!("serviceWorker" in navigator)) {
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    if (event.data?.type === "SW_LOG") {
      const logData = event.data.data;
      switch (logData.type) {
        case "log":
          console.log(`[SW] ${logData.msg}`);
          break;
        case "debug":
          console.debug(`[SW] ${logData.msg}`);
          break;
        case "error":
          console.error(`[SW] ${logData.msg}`);
          break;
        case "warn":
          console.warn(`[SW] ${logData.msg}`);
          break;
        default:
          console.log(`[SW] ${logData.msg}`);
      }
    }
  };

  function addHandlerIfControlled() {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener("message", handler);
    }
  }

  void navigator.serviceWorker.ready.then(addHandlerIfControlled);
  navigator.serviceWorker.addEventListener("controllerchange", addHandlerIfControlled);

  return () => {
    navigator.serviceWorker.removeEventListener("message", handler);
  };
}