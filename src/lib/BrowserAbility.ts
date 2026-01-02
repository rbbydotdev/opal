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

const canUseServiceWorker = async (mode = "runtime") => {
  const supported = "serviceWorker" in navigator;

  if (!supported) return false;
  if (mode === "support-only") return true;

  // runtime test - try to register a minimal service worker
  try {
    // Create a minimal service worker blob
    const swBlob = new Blob(['self.addEventListener("install", () => {});'], { type: "application/javascript" });
    const swUrl = URL.createObjectURL(swBlob);

    const registration = await navigator.serviceWorker.register(swUrl);
    await registration.unregister();
    URL.revokeObjectURL(swUrl);
    return true;
  } catch {
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
export const BrowserAbility = {
  canUseIndexedDB: canUseIndexedDB,
  canUseLocalStorage: canUseLocalStroage,
  canUseServiceWorker: canUseServiceWorker,
  canUseOPFS: canUseOPFS,
};

export const REQUIRED_BROWSER_FEATURES = ["canUseIndexedDB", "canUseLocalStorage", "canUseServiceWorker"] as const;

export async function BrowserAbilityCheckAll() {
  const entries = Object.entries(BrowserAbility) as [keyof typeof BrowserAbility, () => Promise<boolean>][];
  const results = await Promise.all(
    entries.map(async ([name, func]) => ({
      name,
      check: await func(),
      required: REQUIRED_BROWSER_FEATURES.includes(name),
    }))
  );
  return Object.fromEntries(results.map((r) => [r.name, r.check])) as Record<keyof typeof BrowserAbility, boolean>;
}
