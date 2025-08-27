// src/components/Links.tsx

import { useDebounce } from "@/context/useDebounce";
import React, { useEffect } from "react";

const getBaseHref = (href: string): string => href.split("?")[0]!;

interface LinksProps {
  /** An array of stylesheet URLs to apply to the document. */
  hrefs: string[];
  /** The debounce delay in milliseconds. Defaults to 300ms. */
  debounceMs?: number;
}

// domElement?: HTMLElement | null;

export const Links: React.FC<LinksProps> = ({
  hrefs,
  debounceMs = 300,
  domElement = document.head,
}: {
  hrefs: string[];
  debounceMs?: number;
  domElement?: HTMLElement | null;
}) => {
  // Use the debounced version of the hrefs prop.
  // The effect below will only run after the user stops changing the hrefs
  // for the duration of debounceMs.
  const debouncedHrefs = useDebounce(hrefs, debounceMs);

  useEffect(() => {
    const newBaseHrefs = new Set(debouncedHrefs.map(getBaseHref));

    // --- Step 1: Add or Swap links based on the debounced hrefs array ---
    debouncedHrefs.forEach((newHref) => {
      const baseHref = getBaseHref(newHref);
      const oldLink = domElement?.querySelector<HTMLLinkElement>(`link[data-managed-href="${baseHref}"]`);

      if (!oldLink) {
        const newLink = document.createElement("link");
        newLink.rel = "stylesheet";
        newLink.href = newHref;
        newLink.setAttribute("data-managed-href", baseHref);
        domElement?.appendChild(newLink);
      } else if (oldLink.href !== newHref) {
        const newLink = document.createElement("link");
        newLink.rel = "stylesheet";
        newLink.href = newHref;
        newLink.setAttribute("data-managed-href", baseHref);

        const handleLoadOrError = () => {
          oldLink.remove();
          newLink.removeEventListener("load", handleLoadOrError);
          newLink.removeEventListener("error", handleLoadOrError);
        };

        newLink.addEventListener("load", handleLoadOrError);
        newLink.addEventListener("error", handleLoadOrError);
        domElement?.appendChild(newLink);
      }
    });

    // --- Step 2: Clean up old links that are no longer needed ---
    const existingManagedLinks = document.querySelectorAll<HTMLLinkElement>("link[data-managed-href]");

    existingManagedLinks.forEach((link) => {
      const managedHref = link.getAttribute("data-managed-href");
      if (managedHref && !newBaseHrefs.has(managedHref)) {
        link.remove();
      }
    });
  }, [debouncedHrefs, domElement]); // The key change: this effect now depends on the debounced value.

  return null;
};
