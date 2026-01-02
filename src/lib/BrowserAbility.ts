import { BrowserDetection } from "@/lib/BrowserDetection";
import { setupServiceWorker } from "@/lib/service-worker/SwSetup";

export const canUseOPFS = async (mode = "runtime") => {
  const supported =
    typeof navigator !== "undefined" && "storage" in navigator && typeof navigator.storage.getDirectory === "function";

  if (!supported) return false;
  if (mode === "support-only") return true;

  // runtime test
  try {
    const root = await navigator.storage.getDirectory();
    const file = await root.getFileHandle("__test__", { create: true });
    await root.removeEntry("__test__");
    return !!file;
  } catch {
    return false;
  }
};

const canUseIndexedDB = async (mode = "runtime") => {
  const supported = typeof indexedDB !== "undefined";

  if (!supported) return false;
  if (mode === "support-only") return true;

  // runtime test
  try {
    const testDbName = "__test_db__";
    const request = indexedDB.open(testDbName, 1);

    return new Promise<boolean>((resolve) => {
      request.onsuccess = () => {
        const db = request.result;
        db.close();
        indexedDB.deleteDatabase(testDbName);
        resolve(true);
      };

      request.onerror = () => {
        resolve(false);
      };

      request.onblocked = () => {
        resolve(false);
      };
    });
  } catch {
    return false;
  }
};

const canUseServiceWorker = async () => {
  const supported = "serviceWorker" in navigator;

  if (!supported) return false;

  // runtime test - try to register a minimal service worker
  try {
    // Create a minimal service worker blob
    await setupServiceWorker();
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
};

const canUseLocalStroage = async () => {
  const supported = typeof localStorage !== "undefined";

  if (!supported) return false;

  // runtime test
  try {
    const testKey = "__test_key__";
    const testValue = "test";
    localStorage.setItem(testKey, testValue);
    const retrieved = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    return retrieved === testValue;
  } catch {
    return false;
  }
};

const isDesktopBrowser = async () => {
  // Return true if NOT mobile (desktop is required)
  return !BrowserDetection.isMobile();
};
export const BrowserAbility = {
  canUseIndexedDB: canUseIndexedDB,
  canUseLocalStorage: canUseLocalStroage,
  canUseServiceWorker: canUseServiceWorker,
  canUseOPFS: canUseOPFS,
  isDesktopBrowser: isDesktopBrowser,
};

export const REQUIRED_BROWSER_FEATURES = [
  "canUseIndexedDB",
  "canUseLocalStorage",
  "canUseServiceWorker",
  "isDesktopBrowser",
] as const;

export async function BrowserAbilityCheckAll() {
  const entries = Object.entries(BrowserAbility) as [keyof typeof BrowserAbility, () => Promise<boolean>][];
  const results = await Promise.all(
    entries.map(async ([name, func]) => ({
      name,
      check: await func(),
      required: REQUIRED_BROWSER_FEATURES.includes(name),
    }))
  );
  const sorted = [...results].sort((a, b) => Number(a.check) - Number(b.check));
  return Object.fromEntries(sorted.map((r) => [r.name, r.check])) as Record<keyof typeof BrowserAbility, boolean>;
}
