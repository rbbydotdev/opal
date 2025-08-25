import { useRef, useState, useEffect } from "react";

export interface KeyboardNavigationOptions {
  onEnter?: (activeIndex: number, items: Element[]) => void;
  onEscape?: () => void;
  onSelect?: (activeIndex: number) => void;
  wrapAround?: boolean;
  enableTypeToFocus?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export function useKeyboardNavigation(options: KeyboardNavigationOptions = {}) {
  const {
    onEnter,
    onEscape,
    onSelect,
    wrapAround = true,
    enableTypeToFocus = true,
    searchValue,
    onSearchChange,
  } = options;

  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const menuItems = menuRef.current?.querySelectorAll('[role="menuitem"]');
    const itemsLength = menuItems?.length ?? 0;

    switch (e.key) {
      case "Enter":
        e.preventDefault();
        if (activeIndex === -1) {
          // If no item is active, select first item
          setActiveIndex(0);
          return;
        }
        if (onEnter) {
          onEnter(activeIndex, Array.from(menuItems || []));
        } else {
          // Default behavior: click the active item
          (menuItems?.[activeIndex] as HTMLElement)?.click();
        }
        // Call onSelect callback if provided
        onSelect?.(activeIndex);
        break;

      case "Tab":
        e.preventDefault();
        if (e.shiftKey) {
          setActiveIndex((prev) => {
            if (prev > 0) return prev - 1;
            return wrapAround ? itemsLength - 1 : -1;
          });
        } else {
          setActiveIndex((prev) => {
            if (prev < itemsLength - 1) return prev + 1;
            return wrapAround ? -1 : prev;
          });
        }
        break;

      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => {
          if (prev < itemsLength - 1) return prev + 1;
          return wrapAround ? -1 : prev;
        });
        break;

      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => {
          if (prev > 0) return prev - 1;
          return wrapAround ? -1 : prev;
        });
        break;

      case "Home":
        e.preventDefault();
        setActiveIndex(-1);
        break;

      case "End":
        e.preventDefault();
        setActiveIndex(itemsLength - 1);
        break;

      case "Escape":
        e.preventDefault();
        onEscape?.();
        break;

      default:
        // Handle typing to focus input and search
        if (enableTypeToFocus && document.activeElement !== inputRef.current) {
          if (e.key === "Backspace") {
            e.preventDefault();
            e.stopPropagation();
            if (onSearchChange && searchValue !== undefined) {
              onSearchChange(searchValue.slice(0, -1));
            }
            inputRef.current?.focus();
          } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            e.stopPropagation();
            inputRef.current?.focus();
          } else if (e.key.length === 1) {
            e.preventDefault();
            e.stopPropagation();
            if (onSearchChange && searchValue !== undefined) {
              onSearchChange(searchValue + e.key);
            }
            inputRef.current?.focus();
          }
        }
    }
  };

  // Focus management
  useEffect(() => {
    if (activeIndex === -1) {
      inputRef.current?.focus();
    } else {
      const menuItem = menuRef.current?.querySelector<HTMLElement>(`#nav-item-${activeIndex}`);
      menuItem?.focus();
    }
  }, [activeIndex]);

  // Reset active index when items change
  const resetActiveIndex = () => {
    setActiveIndex(-1);
  };

  return {
    activeIndex,
    setActiveIndex,
    resetActiveIndex,
    containerRef,
    inputRef,
    menuRef,
    handleKeyDown,
    // Helper to determine if an item is active
    isItemActive: (index: number) => index === activeIndex,
    // Helper to get aria attributes for input
    getInputProps: () => ({
      ref: inputRef,
      "aria-controls": "keyboard-nav-menu",
      "aria-haspopup": "true" as const,
      "aria-activedescendant": activeIndex > -1 ? `nav-item-${activeIndex}` : undefined,
    }),
    // Helper to get props for menu container
    getMenuProps: () => ({
      ref: menuRef,
      id: "keyboard-nav-menu",
      role: "menu" as const,
    }),
    // Helper to get props for menu items
    getItemProps: (index: number) => ({
      id: `nav-item-${index}`,
      role: "menuitem" as const,
      tabIndex: index === activeIndex ? 0 : -1,
    }),
  };
}