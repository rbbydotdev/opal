"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

interface FloatingSearchBarProps {
  isOpen: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  prev: () => void;
  next: () => void;
  cursor: number;
  onChange: (searchTerm: string | null) => void;
  matchTotal: number;
  onSubmit?: () => void;
  className?: string;
}

export function EditorSearchBar({
  prev,
  next,
  cursor,
  isOpen,
  onClose,
  onChange,
  matchTotal,
  className = "",
}: FloatingSearchBarProps) {
  const [search, setSearch] = useState<string | null>(null);
  const handleClose = useCallback(() => {
    onClose?.();
    onChange(null);
  }, [onChange, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
      if (e.key === "Enter" && isOpen) {
        e.preventDefault();
        if (e.shiftKey) {
          prev();
        } else {
          next();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose, matchTotal, prev, next]);

  const handleSearchChange = (value: string) => {
    onChange?.(value || null);
    setSearch(value || null);
  };

  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (inputRef.current && isOpen) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(0, inputRef.current.value.length);
    }
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div
      tabIndex={0}
      className={twMerge(
        "bg-background border rounded-lg shadow-lg p-2 flex items-center gap-1 min-w-[300px]",
        className
      )}
      onBlur={(e) => {
        // Only close if focus moves outside the search bar and its children
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          handleClose();
        }
      }}
    >
      <div className="flex-1">
        <Input
          ref={inputRef}
          onChange={(e) => handleSearchChange(e.target.value)}
          defaultValue={search ?? ""}
          placeholder="Search"
          className="h-8 text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      <div className="flex items-center gap-1">
        {/* Match Counter */}
        <div className="text-xs text-muted-foreground px-2 py-1 min-w-[60px] text-center">
          {matchTotal > 0 ? `${cursor}/${matchTotal}` : search ? "0/0" : ""}
        </div>

        {/* Navigation Buttons */}
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={prev}
          disabled={matchTotal === 0}
          title="Previous match (Shift+Enter)"
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={next}
          disabled={matchTotal === 0}
          title="Next match (Enter)"
        >
          <ChevronDown className="h-3 w-3" />
        </Button>

        {/* Close Button */}
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleClose} title="Close (Escape)">
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
