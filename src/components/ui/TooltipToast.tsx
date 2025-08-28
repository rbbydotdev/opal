import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { useEffect, useImperativeHandle, useRef, useState } from "react";
export function useTooltipToastCmd() {
  const cmdRef = useRef<{
    show: (text?: string | React.ReactNode, variant?: "info" | "success" | "destructive", duration?: number) => void;
  }>({ show: () => {} });
  return {
    show: (text?: string, variant?: "info" | "success" | "destructive", duration?: number) =>
      cmdRef.current.show(text, variant, duration),
    cmdRef,
  };
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
    show: (text?: string, variant?: "info" | "success" | "destructive", duration?: number) => void;
  }>;
} & React.ComponentProps<typeof TooltipContent>) {
  const [visible, setVisible] = useState(false);
  const [messageText, setText] = useState<string | React.ReactNode>(message || "");
  const [variant, setVariant] = useState<"info" | "success" | "destructive">("info");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  useImperativeHandle(
    cmdRef,
    () => ({
      show: (text?: string | React.ReactNode, variant?: "info" | "success" | "destructive", duration?: number) => {
        if (text) setText(text);
        setVisible(true);
        setVariant(variant || "info");
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setVisible(false);
          setText(messageText);
          setVariant("info");
        }, duration ?? durationMs);
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
        <TooltipContent
          {...props}
          className={cn(className, {
            "bg-primary text-primary-foreground": variant === "info",
            "bg-success text-success-foreground": variant === "success",
            "bg-destructive text-destructive-foreground": variant === "destructive",
          })}
        >
          <div>
            {messageText}
            <TooltipPrimitive.TooltipArrow
              className={cn({
                "fill-primary": variant === "info",
                "fill-success": variant === "success",
                "fill-destructive": variant === "destructive",
              })}
            />
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
