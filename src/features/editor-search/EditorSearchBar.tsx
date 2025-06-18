"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface FloatingSearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  onSearchChange?: (searchTerm: string, currentMatch: number, totalMatches: number) => void;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  className?: string;
}

export function FloatingSearchBar({
  isOpen,
  onClose,
  content,
  onSearchChange,
  position = "top-right",
  className = "",
}: FloatingSearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentMatch, setCurrentMatch] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Calculate matches when search term or content changes
  useEffect(() => {
    if (!searchTerm) {
      setTotalMatches(0);
      setCurrentMatch(0);
      onSearchChange?.(searchTerm, 0, 0);
      return;
    }

    const matches = content.toLowerCase().split(searchTerm.toLowerCase()).length - 1;
    setTotalMatches(matches);
    const newCurrentMatch = matches > 0 && currentMatch === 0 ? 1 : Math.min(currentMatch, matches);
    setCurrentMatch(newCurrentMatch);
    onSearchChange?.(searchTerm, newCurrentMatch, matches);
  }, [searchTerm, content, onSearchChange, currentMatch]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
      if (e.key === "Enter" && isOpen && searchTerm) {
        e.preventDefault();
        if (e.shiftKey) {
          navigateToMatch("up");
        } else {
          navigateToMatch("down");
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, searchTerm, currentMatch, totalMatches]);

  const navigateToMatch = (direction: "up" | "down") => {
    if (totalMatches === 0) return;

    let newMatch: number;
    if (direction === "down") {
      newMatch = currentMatch >= totalMatches ? 1 : currentMatch + 1;
    } else {
      newMatch = currentMatch <= 1 ? totalMatches : currentMatch - 1;
    }

    setCurrentMatch(newMatch);
    onSearchChange?.(searchTerm, newMatch, totalMatches);
  };

  const handleClose = () => {
    setSearchTerm("");
    setCurrentMatch(0);
    setTotalMatches(0);
    onClose();
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (!value) {
      setCurrentMatch(0);
      setTotalMatches(0);
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case "top-left":
        return "top-4 left-4";
      case "bottom-right":
        return "bottom-4 right-4";
      case "bottom-left":
        return "bottom-4 left-4";
      case "top-right":
      default:
        return "top-4 right-4";
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`absolute ${getPositionClasses()} bg-background border rounded-lg shadow-lg p-2 flex items-center gap-1 min-w-[300px] z-50 ${className}`}
    >
      <div className="flex-1">
        <Input
          ref={searchInputRef}
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search"
          className="h-8 text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      <div className="flex items-center gap-1">
        {/* Match Counter */}
        <div className="text-xs text-muted-foreground px-2 py-1 min-w-[60px] text-center">
          {totalMatches > 0 ? `${currentMatch}/${totalMatches}` : searchTerm ? "0/0" : ""}
        </div>

        {/* Navigation Buttons */}
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={() => navigateToMatch("up")}
          disabled={totalMatches === 0}
          title="Previous match (Shift+Enter)"
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={() => navigateToMatch("down")}
          disabled={totalMatches === 0}
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
