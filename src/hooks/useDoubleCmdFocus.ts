import { useEffect, useRef, useState } from "react";
import { IS_MAC } from "@/lib/isMac";

export function useDoubleCmdFocus() {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [searchSequence, setSearchSequence] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    let lastKeyPressTime = 0;
    let keyPressCount = 0;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isModKey = IS_MAC ? event.metaKey : event.ctrlKey;
      
      if (isModKey && !event.altKey && !event.shiftKey && (event.key === "Meta" || event.key === "Control")) {
        const currentTime = Date.now();
        
        if (currentTime - lastKeyPressTime < 300) { // 300ms threshold for double press
          keyPressCount++;
          if (keyPressCount === 2) {
            // Always focus/reset to the first focusable element
            if (elementRef.current) {
              const firstFocusableElement = elementRef.current.querySelector(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
              ) as HTMLElement;
              
              if (firstFocusableElement) {
                firstFocusableElement.focus();
              } else {
                elementRef.current.focus();
              }
              setIsFocused(true);
              // Reset search sequence on double tap
              setSearchSequence("");
              if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
              }
            }
            keyPressCount = 0;
          }
        } else {
          keyPressCount = 1;
        }
        
        lastKeyPressTime = currentTime;
      } else {
        keyPressCount = 0;
      }
    };

    const handleLetterJump = (event: KeyboardEvent) => {
      if (!isFocused || !elementRef.current) return;
      
      // Check if it's a letter key (a-z)
      if (event.key.length === 1 && /[a-zA-Z]/.test(event.key)) {
        const letter = event.key.toLowerCase();
        
        // Clear previous timeout
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
        
        // Build search sequence
        const newSequence = searchSequence + letter;
        setSearchSequence(newSequence);
        
        // Find all visible sections with data-section-name attributes
        const sections = Array.from(elementRef.current.querySelectorAll('[data-section-name]')) as HTMLElement[];
        const visibleSections = sections.filter(section => {
          return section.offsetParent !== null; // Check if element is visible
        });
        
        // Find sections that start with our search sequence
        const matchingSections = visibleSections.filter(section => {
          const sectionName = section.getAttribute('data-section-name')?.toLowerCase() || '';
          return sectionName.startsWith(newSequence);
        });
        
        if (matchingSections.length > 0) {
          // Count how many times this letter has been pressed in sequence (including this press)
          let repeatCount = 0;
          for (let i = newSequence.length - 1; i >= 0; i--) {
            if (newSequence[i] === letter) {
              repeatCount++;
            } else {
              break;
            }
          }
          
          // Use the repeat count to determine which section to target
          // 1st press = index 0, 2nd press = index 1, etc.
          const targetIndex = (repeatCount - 1) % matchingSections.length;
          const targetSection = matchingSections[targetIndex];
          if (targetSection) {
            const focusableElement = targetSection.querySelector(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            ) as HTMLElement;
            
            if (focusableElement) {
              focusableElement.focus();
            } else {
              targetSection.focus();
            }
          }
        }
        
        // Clear search sequence after 800ms
        searchTimeoutRef.current = setTimeout(() => {
          setSearchSequence("");
        }, 800);
      }
    };

    const handleBlur = (event: FocusEvent) => {
      if (!elementRef.current) return;
      
      // Check if focus is moving outside our container
      const relatedTarget = event.relatedTarget as HTMLElement;
      if (!relatedTarget || !elementRef.current.contains(relatedTarget)) {
        setIsFocused(false);
        setSearchSequence("");
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    
    const currentElement = elementRef.current;
    if (currentElement) {
      currentElement.addEventListener("keydown", handleLetterJump);
      currentElement.addEventListener("focusout", handleBlur);
    }
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (currentElement) {
        currentElement.removeEventListener("keydown", handleLetterJump);
        currentElement.removeEventListener("focusout", handleBlur);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [isFocused, searchSequence]);

  return elementRef;
}