import { useBrowserCompat } from "@/features/compat-checker/CompatChecker";
import { useLayoutEffect, useState } from "react";
import { setupServiceWorkerLogger } from "./sw-logger-setup";

export const ServiceWorker = ({ children }: { children?: React.ReactNode }) => {
  const [ready, setReady] = useState(!!navigator.serviceWorker.controller);
  const { hasFeature } = useBrowserCompat();

  useLayoutEffect(() => {
    if (!hasFeature("canUseServiceWorker")) setReady(true); // If service workers are not supported, consider SW as ready
    void setupServiceWorker()
      .then(() => setReady(true))
      .catch(() => setReady(true));
  }, [hasFeature]);

  if (!ready) return null;
  return <>{children}</>;
};

export async function setupServiceWorker(): Promise<void> {
  try {
    // Register the service worker if it's not controlling the page
    if (!navigator.serviceWorker.controller) {
      console.warn("Service Worker is not controlling the page.");
      await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      console.log("service worker ready");
    }

    // Setup service worker logger
    setupServiceWorkerLogger();
  } catch (error) {
    console.error("Error setting up Service Worker", error);
    throw error;
  }
}
