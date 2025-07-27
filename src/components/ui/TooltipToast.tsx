import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { useEffect, useImperativeHandle, useRef, useState } from "react";
export function useTooltipToastCmd() {
  const cmdRef = useRef<{ show: () => void }>({ show: () => {} });
  return { show: () => cmdRef.current.show(), cmdRef };
}
export function TooltipToast({
  message,
  durationMs = 2000,
  children,
  className,
  cmdRef,
  ...props
}: {
  message: string;
  durationMs?: number;
  children: React.ReactNode;
  className?: string;
  cmdRef: React.ForwardedRef<{
    show: () => void;
  }>;
} & React.ComponentProps<typeof TooltipContent>) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  useImperativeHandle(
    cmdRef,
    () => ({
      show: () => {
        setVisible(true);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setVisible(false);
        }, durationMs);
      },
    }),
    [durationMs, setVisible]
  );
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  return (
    <TooltipProvider>
      <Tooltip open={visible}>
        <TooltipTrigger asChild>
          <span>{children}</span>
        </TooltipTrigger>
        <TooltipContent {...props} className={className}>
          <div>
            {message}
            <TooltipPrimitive.TooltipArrow className="fill-inherit" />
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
