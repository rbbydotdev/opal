import React from "react";

export function useEscapeKeyClose(openState: boolean, closeFn: () => void) {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (openState && event.key === "Escape") {
        closeFn();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openState, closeFn]);
}
