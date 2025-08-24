import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { useEffect, useImperativeHandle, useRef, useState } from "react";
export function useTooltipToastCmd() {
  const cmdRef = useRef<{ show: (text?: string) => void }>({ show: () => {} });
  return { show: (text?: string) => cmdRef.current.show(text), cmdRef };
}
export function TooltipToast({
  message,
  durationMs = 2000,
  children,
  className,
  cmdRef,
  ...props
}: {
  message?: string;
  durationMs?: number;
  children?: React.ReactNode;
  className?: string;
  cmdRef: React.ForwardedRef<{
    show: () => void;
  }>;
} & React.ComponentProps<typeof TooltipContent>) {
  const [visible, setVisible] = useState(false);
  const [messageText, setText] = useState(message || "");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  useImperativeHandle(
    cmdRef,
    () => ({
      show: (text?: string) => {
        if (text) setText(text);
        setVisible(true);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setVisible(false);
          setText(messageText);
        }, durationMs);
      },
    }),
    [durationMs, messageText]
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
            {messageText}
            <TooltipPrimitive.TooltipArrow className="fill-primary" />
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
