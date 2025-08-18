export const BrowserAbility = {
  canUseIndexedDB: () => {
    return typeof indexedDB !== "undefined";
  },
  canUseLocalStorage: () => {
    return typeof localStorage !== "undefined";
  },
  canUseServiceWorker: () => {
    return "serviceWorker" in navigator;
  },
  canUseOPFS: () => {
    return (
      typeof FileSystemHandle !== "undefined" &&
      (/Chrome/.test(navigator.userAgent) || /Firefox/.test(navigator.userAgent))
    );
  },
};
