"use client";

import { useEffect, useState } from "react";

export function canUseSearchTool() {
  return typeof Highlight !== "undefined" && typeof CSS.highlights !== "undefined";
}
export function useEditorSearchTool() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (canUseSearchTool() && (e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openSearch = () => setIsSearchOpen(true);
  const closeSearch = () => setIsSearchOpen(false);
  const toggleSearch = () => setIsSearchOpen((prev) => !prev);

  return {
    isSearchOpen,
    openSearch,
    closeSearch,
    toggleSearch,
  };
}
