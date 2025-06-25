export function CheckCompat() {
  const hasClipboard = !!navigator.clipboard;
  const hasServiceWorker = "serviceWorker" in navigator;
  const hasIndexedDB = "indexedDB" in window;
  const hasWebWorker = typeof Worker !== "undefined";

  let error = "";
  if (!hasClipboard) error += "Clipboard API not supported. ";
  if (!hasServiceWorker) error += "Service Worker not supported. ";
  if (!hasIndexedDB) error += "IndexedDB not supported. ";
  if (!hasWebWorker) error += "Web Worker not supported. ";

  return {
    error: !!error,
    errorMsg: error.trim(),
    clipboard: hasClipboard,
    serviceWorker: hasServiceWorker,
    indexedDB: hasIndexedDB,
    webWorker: hasWebWorker,
  };
}
