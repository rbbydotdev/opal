import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import React, { useMemo, useState } from "react";

interface ExampleDropdownProps {
  options: string[];
  placeholder?: string;
  onSelect?: (option: string) => void;
}

export function ExampleDropdown({ options, placeholder = "Search...", onSelect }: ExampleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchValue.trim()) return options;
    return options.filter((option) => option.toLowerCase().includes(searchValue.toLowerCase()));
  }, [options, searchValue]);

  const {
    activeIndex,
    resetActiveIndex,
    containerRef,
    handleKeyDown,
    getInputProps,
    getMenuProps,
    getItemProps,
    isItemActive,
  } = useKeyboardNavigation({
    onEnter: (activeIndex, items) => {
      if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
        const selectedOption = filteredOptions[activeIndex];
        onSelect?.(selectedOption!);
        setSearchValue(selectedOption!);
        setIsOpen(false);
      }
    },
    onEscape: () => {
      setIsOpen(false);
      setSearchValue("");
    },
    searchValue,
    onSearchChange: setSearchValue,
    wrapAround: true,
  });

  // Reset active index when filtered options change
  React.useEffect(() => {
    resetActiveIndex();
  }, [filteredOptions, resetActiveIndex]);

  const handleItemClick = (option: string) => {
    onSelect?.(option);
    setSearchValue(option);
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Close dropdown if focus moves outside the component
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm" onKeyDown={handleKeyDown} onBlur={handleBlur}>
      <input
        {...getInputProps()}
        type="text"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      {isOpen && filteredOptions.length > 0 && (
        <ul
          {...getMenuProps()}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredOptions.map((option, index) => (
            <li key={option} className="w-full">
              <button
                {...getItemProps(index)}
                onClick={() => handleItemClick(option)}
                className={`w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-100 focus:outline-none ${
                  isItemActive(index) ? "bg-blue-100" : ""
                }`}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}

      {isOpen && filteredOptions.length === 0 && searchValue && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="px-3 py-2 text-gray-500">No options found</div>
        </div>
      )}
    </div>
  );
}
