export function isServiceWorker(): boolean {
  // Check if 'self' is defined and is an instance of ServiceWorkerGlobalScope
  return typeof self !== "undefined" && "ServiceWorkerGlobalScope" in self && self instanceof ServiceWorkerGlobalScope;
}
export function isWebWorker(): boolean {
  return typeof importScripts === "function";
}
