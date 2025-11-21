import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { useCallback } from "react";

export type ModalShellProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  subtitle?: string;
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
  title,
  description,
  subtitle,
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
        <DialogHeader>
          <DialogTitle>
            <div className="flex gap-4 justify-start items-center mb-4 text-xl">
              {canGoBack && onBack && (
                <Button variant="outline" size="sm" title="back" onClick={onBack}>
                  <ArrowLeft />
                  <div className="uppercase text-2xs">back</div>
                </Button>
              )}
              {title}
            </div>
          </DialogTitle>
          {(description || subtitle) && (
            <DialogDescription className="flex flex-col w-full">
              {subtitle && <span className="font-bold text-lg text-foreground">{subtitle}</span>}
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        
        {children}
      </DialogContent>
    </Dialog>
  );
}