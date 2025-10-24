import { cn } from "@/lib/utils";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import React from "react";

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;
const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>(({ children, className, ...props }, ref) => {
  return (
    <CollapsiblePrimitive.CollapsibleContent ref={ref} className={cn("CollapsibleContent", className)} {...props}>
      {children}
    </CollapsiblePrimitive.CollapsibleContent>
  );
});
CollapsibleContent.displayName = "CollapsibleContent";

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
