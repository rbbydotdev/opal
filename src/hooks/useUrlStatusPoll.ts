import { useQuery } from "@tanstack/react-query";

export interface UrlStatusResult {
  status: "checking" | "ready" | "error" | "disabled";
  error?: string;
}

// CORS-free URL checking using image loading technique
async function checkUrlAccessibility(url: string, signal: AbortSignal): Promise<boolean | null> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    const cleanup = () => {
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
    };

    const onLoad = () => {
      cleanup();
      resolve(true); // Ready!
    };

    const onError = () => {
      cleanup();
      // If favicon fails to load, the site might not be ready yet (404)
      // Since we now ensure a favicon gets deployed, favicon failure likely means 404
      resolve(null); // Not ready, continue polling
    };

    const onAbort = () => {
      cleanup();
      reject(new DOMException("Request was aborted", "AbortError"));
    };

    img.addEventListener("load", onLoad);
    img.addEventListener("error", onError);

    if (signal.aborted) {
      reject(new DOMException("Request was aborted", "AbortError"));
      return;
    }

    signal.addEventListener("abort", onAbort);

    // Try to load the favicon instead of the page itself
    const faviconUrl = new URL(url);
    // Append favicon.ico to the existing pathname (don't replace it)
    faviconUrl.pathname = faviconUrl.pathname.replace(/\/$/, '') + "/favicon.ico";
    faviconUrl.search = ""; // Clear any query params
    faviconUrl.hash = ""; // Clear any hash

    const testUrl = faviconUrl.toString() + "?_t=" + Date.now();
    img.src = testUrl;

    // Fallback timeout for very slow responses
    setTimeout(() => {
      cleanup();
      signal.removeEventListener("abort", onAbort);
      // Timeout means we couldn't determine accessibility
      resolve(null); // Not ready, continue polling
    }, 8000);
  });
}

export function useUrlStatusPoll(url: string | undefined, pollInterval = 3000): UrlStatusResult {
  const { data: isAccessible, error, isLoading, isError } = useQuery({
    queryKey: ["url-accessibility", url],
    queryFn: async ({ signal }) => {
      if (!url) return null;
      return await checkUrlAccessibility(url, signal);
    },
    enabled: Boolean(url),
    refetchInterval: (data) => {
      // The data parameter is the query object, actual data is in data.state.data
      const actualData = data?.state?.data;
      // Stop polling if successful, continue if not ready
      return actualData === true ? false : pollInterval;
    },
    retry: (failureCount, error) => {
      // Keep retrying for network/timeout errors, but not for other errors
      if (error instanceof Error && error.name === "AbortError") {
        return false;
      }
      return failureCount < 10; // Allow more retries for deployment polling
    },
    retryDelay: 2000,
  });

  if (!url) {
    return { status: "disabled" };
  }

  if (isLoading) {
    return { status: "checking" };
  }

  if (isError) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unable to reach URL",
    };
  }

  if (isAccessible === true) {
    return { status: "ready" };
  }

  // isAccessible is null or we're still loading - keep checking
  return { status: "checking" };
}