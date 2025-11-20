import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { forwardRef } from "react";

interface KeyboardShortcutsSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const KeyboardShortcutsSearch = forwardRef<HTMLInputElement, KeyboardShortcutsSearchProps>(
  ({ value, onChange, placeholder = "Search shortcuts...", className }, ref) => {
    const handleMagnifyClick = () => {
      if (ref && "current" in ref) {
        ref.current?.focus();
      }
    };

    return (
      <div className="relative mb-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer"
            onClick={handleMagnifyClick}
          />
          <Input
            ref={ref}
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`pl-10 ${className || ""}`}
          />
        </div>
      </div>
    );
  }
);

KeyboardShortcutsSearch.displayName = "KeyboardShortcutsSearch";
