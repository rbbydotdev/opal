import { useEffect } from "react";

export function usePreventNavigation(activated: boolean, message = " Are you sure you want to leave?") {
  useEffect(() => {
    if (!activated) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    const handlePopState = () => {
      // When activated, push the current URL back to the history stack to deter back navigation.
      // We don't call preventDefault here because popstate can't cancel navigation — replacing history is used instead.
      try {
        window.history.pushState(null, "", window.location.href);
      } catch {
        /* ignore */
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    // Ensure there's a history entry to push back against
    try {
      window.history.pushState(null, "", window.location.href);
    } catch {
      /* ignore */
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [activated, message]);
}
