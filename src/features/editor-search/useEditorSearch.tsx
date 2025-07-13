"use client";

import { useCellValue, viewMode$ } from "@mdxeditor/editor";
import { useEffect, useState } from "react";

export function canShowSearchTool() {
  return typeof Highlight !== "undefined" && typeof CSS.highlights !== "undefined";
}
export function useEditorSearchTool() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const viewMode = useCellValue(viewMode$);

  useEffect(() => {
    if (!canShowSearchTool() || viewMode !== "rich-text") return;
    const handleSearchKeyboardShortcut = (e: KeyboardEvent) => {
      //cmd+f
      if ((e.ctrlKey || e.metaKey) && e.key === "f" && !e.shiftKey) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    //TODO, need a gobal store  so these dont interfere with each other
    document.addEventListener("keydown", handleSearchKeyboardShortcut);
    return () => document.removeEventListener("keydown", handleSearchKeyboardShortcut);
  }, [viewMode]);

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
