import { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

export const DragPreviewNode = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }
>(({ children, className, ...rest }, ref) => {
  return (
    <div
      ref={ref}
      // Critical: Style the component to be positioned off-screen.
      // This prevents it from flashing on the screen for a frame.
      {...rest}
      style={{
        position: "absolute",
        top: -1000,
        minWidth: "5px",
        minHeight: "50px",
        left: -1000,
        pointerEvents: "none", // Ensure it doesn't interfere with mouse events.
        ...(rest.style ? { ...rest.style } : {}),
      }}
      className={twMerge(" flex items-center justify-center", className)}
    >
      {children}
    </div>
  );
});
// Define the props your preview component might need.

DragPreviewNode.displayName = "DragPreviewNode";
