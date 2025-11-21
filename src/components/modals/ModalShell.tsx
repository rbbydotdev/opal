import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { useCallback } from "react";

export type ModalShellProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  
  // Navigation
  canGoBack?: boolean;
  onBack?: () => void;
  
  // Layout
  className?: string;
  contentClassName?: string;
  
  // Behaviors
  onPointerDownOutside?: () => void;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  closeOnOutsideClick?: boolean;
};

export function ModalShell({
  isOpen,
  onOpenChange,
  children,
  canGoBack = false,
  onBack,
  className,
  contentClassName,
  onPointerDownOutside,
  onEscapeKeyDown,
  closeOnOutsideClick = true,
}: ModalShellProps) {
  
  const handlePointerDownOutside = useCallback(() => {
    if (onPointerDownOutside) {
      onPointerDownOutside();
    } else if (closeOnOutsideClick) {
      onOpenChange(false);
    }
  }, [onPointerDownOutside, closeOnOutsideClick, onOpenChange]);

  const handleEscapeKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (onEscapeKeyDown) {
        return onEscapeKeyDown(event);
      }
      
      // Default escape behavior
      if (event.target instanceof HTMLElement && event.target.closest(`[data-no-escape]`)) {
        return event.preventDefault();
      }
      event.preventDefault();
      
      if (canGoBack && onBack) {
        return onBack();
      }
      
      onOpenChange(false);
    },
    [onEscapeKeyDown, canGoBack, onBack, onOpenChange]
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "overflow-y-auto top-[10vh] min-h-[50vh] max-w-2xl",
          contentClassName,
          className
        )}
        onPointerDownOutside={handlePointerDownOutside}
        onEscapeKeyDown={handleEscapeKeyDown}
      >
        {/* Navigation Button - positioned absolutely so it doesn't interfere with content layout */}
        {canGoBack && onBack && (
          <Button 
            variant="outline" 
            size="sm" 
            className="absolute top-4 left-4 z-10"
            title="back" 
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="uppercase text-2xs ml-1">back</span>
          </Button>
        )}
        
        {/* Content has full control */}
        {children}
      </DialogContent>
    </Dialog>
  );
}