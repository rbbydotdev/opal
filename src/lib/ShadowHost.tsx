import React, { useEffect, useRef } from "react";
import { createRoot, Root } from "react-dom/client";

type ShadowHostProps = {
  children: React.ReactNode;
};

export function ShadowHost({ children }: ShadowHostProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);
  const reactRootRef = useRef<Root | null>(null);

  useEffect(() => {
    if (hostRef.current && !shadowRootRef.current) {
      // Create shadow root
      shadowRootRef.current = hostRef.current.attachShadow({ mode: "open" });

      // Create a container inside shadow root
      const mountPoint = document.createElement("div");
      shadowRootRef.current.appendChild(mountPoint);

      // Mount React into shadow root
      reactRootRef.current = createRoot(mountPoint);
      reactRootRef.current.render(children);
    }

    return () => {
      reactRootRef.current?.unmount();
    };
  }, [children]);

  return <div ref={hostRef} />;
}
