"use client";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { IS_MAC } from "@/lib/isMac";
import clsx from "clsx";
import { ChevronDown, ChevronRight, ChevronUp, Replace, ReplaceAll, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

interface FloatingSearchBarProps {
  isOpen: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  prev: () => void;
  next: () => void;
  cursor: number;
  onChange: (searchTerm: string | null) => void;
  replace: (str: string, onUpdate?: () => void) => void;
  replaceAll: (str: string, onUpdate?: () => void) => void;
  matchTotal: number;
  onSubmit?: () => void;
  className?: string;
  closeOnBlur?: boolean;
}

export function EditorSearchBar({
  prev,
  next,
  cursor,
  isOpen,
  replace,
  replaceAll,
  onClose,
  onChange,
  closeOnBlur = true,
  matchTotal,
  className = "",
}: FloatingSearchBarProps) {
  const editorSearchBarRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState<string | null>(null);
  const [isReplaceExpanded, setIsReplaceExpanded] = useState<boolean>(false);
  const pauseBlurClose = useRef(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleClose = () => {
    onClose?.();
    onChange(null);
  };

  const handleSearchChange = (value: string) => {
    onChange?.(value || null);
    setSearch(value || null);
  };

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selectSearchText = () => {
    if (searchInputRef.current && isOpen) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    }
  };
  useEffect(() => {
    if (searchInputRef.current) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter" && isOpen) {
          e.preventDefault();
          if (e.shiftKey) {
            prev();
          } else {
            next();
          }
        }
      };
      const ref = searchInputRef.current;
      ref.addEventListener("keydown", handleKeyDown);
      return () => {
        ref.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, next, prev]);

  useEffect(() => {
    if (editorSearchBarRef.current) {
      const handleWindowSearchHotkey = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "f" && isOpen && !e.shiftKey) {
          selectSearchText();
        }
      };
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && isOpen) {
          handleClose();
        }
      };
      window.addEventListener("keydown", handleWindowSearchHotkey);
      const ref = editorSearchBarRef.current;
      ref.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleWindowSearchHotkey);
        ref.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, handleClose, matchTotal, prev, next, selectSearchText]);

  //this is a work around replacing text node in via "lexical way" requires a selection range
  //which when used will trigger a blur of the search bar thus triggering a close when closeOnBlur is true
  const pauseBlurCallback = function pauseBlurCallback() {
    pauseBlurClose.current = true;
    return () => {
      replaceInputRef.current?.addEventListener(
        "focus",
        () => {
          pauseBlurClose.current = false;
        },
        { once: true }
      );
      replaceInputRef.current?.focus();
    };
  };
  //watch for 'submit'
  const handleReplaceInputKeydown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (replaceInputRef.current === null) return;
      // if cmd or ctrl is pressed, replace all
      if (e.ctrlKey || e.metaKey) {
        replaceAll(replaceInputRef.current.value, pauseBlurCallback());
        return;
      }
      replace(replaceInputRef.current.value, pauseBlurCallback());
    }
  };
  useEffect(() => {
    if (isOpen && search) {
      setSearch(search);
      onChange(search);
    }
  }, [isOpen, onChange, search]);

  const handleReplace = () => {
    replace(replaceInputRef?.current?.value ?? "", pauseBlurCallback());
  };

  const handleReplaceAll = () => {
    replaceAll(replaceInputRef?.current?.value ?? "", pauseBlurCallback());
  };

  useEffect(() => {
    //because react on blur is not working how i want it to...
    if (!isOpen) return;
    const handleOtherFocus = (e: FocusEvent) => {
      if (closeOnBlur && !(e.currentTarget as Node)?.contains?.(e.relatedTarget as Node) && !pauseBlurClose.current) {
        handleClose();
      }
    };
    window.addEventListener("focus", handleOtherFocus);
    return () => window.removeEventListener("focus", handleOtherFocus);
  }, [closeOnBlur, handleClose, isOpen]);
  if (!isOpen) return null;

  return (
    <div
      ref={editorSearchBarRef}
      onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "BUTTON") {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      // onBlur={(e) => {
      //   // Only close if focus moves outside the search bar and its children
      //   // also ignore blur events triggered by the replace input
      //   if (closeOnBlur && !e.currentTarget.contains(e.relatedTarget as Node) && !pauseBlurClose.current) {
      //     handleClose();
      //   }
      // }}
      className={twMerge(
        clsx({ "animate-in": open }),
        "bg-transparent backdrop-blur-md border rounded-lg shadow-lg flex absolute top-12 translate-y-4 right-4 z-50",
        className
      )}
    >
      <div className={"p-2 flex flex-col items-center gap-1"}>
        <Collapsible className="group/collapsible" defaultOpen={true}>
          <div className="flex items-center gap-1 w-full">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="h-6 w-6 flex p-0 flex-shrink-0"
                onClick={() => setIsReplaceExpanded(!isReplaceExpanded)}
                title={isReplaceExpanded ? "Hide Replace" : "Show Replace"}
              >
                <ChevronRight
                  size={14}
                  className={
                    "transition-transform duration-100 group-data-[state=open]/collapsible:rotate-90 group-data-[state=closed]/collapsible:rotate-0 -ml-0.5"
                  }
                />
              </Button>
            </CollapsibleTrigger>

            <div className="flex-1">
              <Input
                ref={searchInputRef}
                onChange={(e) => handleSearchChange(e.target.value)}
                defaultValue={search ?? ""}
                placeholder="Search"
                className="w-72 h-8 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground px-2 py-1 text-center w-20 flex items-start">
                {matchTotal > 0 ? `${cursor}/${matchTotal}` : search ? "0/0" : ""}
              </div>
            </div>
          </div>
          <CollapsibleContent>
            <div className="flex items-center mt-2 w-full">
              <div className="pl-7">
                <Input
                  ref={replaceInputRef}
                  placeholder="Replace"
                  className="w-72 h-8 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                  onKeyDown={handleReplaceInputKeydown}
                />
              </div>
              <div className="px-2 flex gap-4">
                <Button variant="outline" className="w-6 h-6 p-0" title="Replace (Enter)" onClick={handleReplace}>
                  <Replace />
                </Button>
                <Button
                  variant="outline"
                  className="w-6 h-6 p-0"
                  title={`Replace All (${IS_MAC ? "⌘" : "Ctrl"}+Enter)`}
                  onClick={handleReplaceAll}
                >
                  <ReplaceAll />
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
      <div className="flex w-full p-2 justify-start">
        <div className="w-full gap-1 flex justify-start">
          <Button
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={prev}
            disabled={matchTotal === 0}
            title="Previous match (Shift+Enter)"
          >
            <ChevronUp />
          </Button>
          <Button
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={next}
            disabled={matchTotal === 0}
            title="Next match (Enter)"
          >
            <ChevronDown />
          </Button>
        </div>
        <div>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleClose} title="Close (Escape)">
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
