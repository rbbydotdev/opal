export async function unregisterServiceWorkers() {
  if ("serviceWorker" in navigator) {
    await navigator.serviceWorker.getRegistration().then(async (registration) => {
      if (registration) {
        await registration.unregister();
      }
    });
  }
}
