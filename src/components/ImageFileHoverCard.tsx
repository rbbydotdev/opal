import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import React from "react";

export function ImageFileHoverCard({ children, src }: { children: React.ReactNode; src?: string }) {
  // Ensure children is a single React element and is an <img>
  if (!React.isValidElement(children) || children.type !== "img") {
    throw new Error("ImageFileHoverCard expects a single <img> element as its child.");
  }

  //
  const finalSrc = src ?? (children as React.ReactElement<{ src: string }>).props.src;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side="right"
        // sideOffset={20}
        className="p-2 bg-white border border-gray-200 shadow-lg rounded w-32 h-32 relative "
        style={{ boxShadow: "0 4px 12px 0 hsl(var(--foreground))" }}
      >
        {/* Triangle edge pointing left */}
        {/* <span
          style={{
            position: "absolute",
            left: "-22px",
            top: "50%",
            transform: "translateY(-50%)",
            width: 0,
            height: 0,
            borderTop: "20px solid transparent",
            borderBottom: "20px solid transparent",
            borderRight: "22px solid white",
          }}
        /> */}
        <img src={finalSrc} alt="Image preview" className="object-cover w-full h-full" />
      </HoverCardContent>
    </HoverCard>
  );
}
