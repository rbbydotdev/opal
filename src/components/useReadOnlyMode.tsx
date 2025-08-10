import { useCallback, useEffect, useState } from "react";

export function useReadOnlyMode(
  type: "hash" | "search" = "hash"
): [readOnlyMode: boolean, setReadonlyMode: (value: boolean) => void, clear: () => void] {
  // Helper to get the current URL params
  const getUrl = useCallback(() => (type === "hash" ? window.location.hash : window.location.search), [type]);
  const getParams = useCallback(() => new URLSearchParams(getUrl().replace(/^[?#]/, "")), [getUrl]);

  // State for readonly mode
  const [readOnlyMode, setReadOnlyMode] = useState(() => {
    return getParams().get("readonly")?.replace(/"/g, "") === "true";
  });

  // Sync state when URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      const params = getParams();
      const urlValue = params.get("readonly")?.replace(/"/g, "") === "true";
      setReadOnlyMode(urlValue);
    };

    if (type === "hash") {
      window.addEventListener("hashchange", handleUrlChange);
    } else {
      window.addEventListener("popstate", handleUrlChange);
    }

    return () => {
      if (type === "hash") {
        window.removeEventListener("hashchange", handleUrlChange);
      } else {
        window.removeEventListener("popstate", handleUrlChange);
      }
    };
  }, [getParams, type]);

  // Sync URL when state changes
  useEffect(() => {
    const params = getParams();
    const urlValue = params.get("readonly")?.replace(/"/g, "") === "true";
    if (readOnlyMode !== urlValue) {
      params.set("readonly", String(readOnlyMode));
      if (type === "hash") {
        window.location.hash = `#${params.toString()}`;
      } else {
        const url = new URL(window.location.href);
        url.search = `?${params.toString()}`;
        window.history.replaceState({}, "", url.toString());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnlyMode, type]);

  // Setter that updates state (and thus URL via effect)
  const setReadonlyMode = useCallback((value: boolean) => {
    setReadOnlyMode(value);
  }, []);

  // Clear function
  const clear = useCallback(() => {
    if (type === "hash") {
      window.location.hash = "";
    } else {
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.toString());
    }
  }, [type]);

  return [readOnlyMode, setReadonlyMode, clear];
}
