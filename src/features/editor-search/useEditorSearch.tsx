"use client";

import { useEffect, useState } from "react";

export function canUseSearchTool() {
  return typeof Highlight !== "undefined" && typeof CSS.highlights !== "undefined";
}
export function useEditorSearchTool() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    if (!canUseSearchTool()) return;
    const handleSearchKeyboardShortcut = (e: KeyboardEvent) => {
      //cmd+f
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    //TODO, need a gobal store  so these dont interfere with each other
    document.addEventListener("keydown", handleSearchKeyboardShortcut);
    return () => document.removeEventListener("keydown", handleSearchKeyboardShortcut);
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
