// Global state for tracking recent hover card activity
let lastHoverCardOpenTime = 0;

export function useHoverCardDelay() {
  const updateLastOpenTime = () => {
    lastHoverCardOpenTime = Date.now();
  };

  const getOpenDelay = () => {
    const now = Date.now();
    const timeSinceLastOpen = now - lastHoverCardOpenTime;
    // If a hover card was opened within 750ms, open immediately
    return timeSinceLastOpen < 750 ? 0 : 700;
  };

  return {
    updateLastOpenTime,
    getOpenDelay,
  };
}