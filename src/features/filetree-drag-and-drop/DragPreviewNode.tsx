import { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

export const DragPreviewNode = forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
  ({ children, className }, ref) => {
    return (
      <div
        ref={ref}
        // Critical: Style the component to be positioned off-screen.
        // This prevents it from flashing on the screen for a frame.
        style={{
          position: "absolute",
          top: -1000,
          minWidth: "50px",
          minHeight: "50px",
          overflow: "hidden",
          left: -1000,
          pointerEvents: "none", // Ensure it doesn't interfere with mouse events.
        }}
        className={twMerge("bg-white rounded shadow-lg flex items-center justify-center", className)}
      >
        {children}
      </div>
    );
  }
);
// Define the props your preview component might need.

DragPreviewNode.displayName = "DragPreviewNode";
