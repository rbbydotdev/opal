import { Slot } from "@radix-ui/react-slot";
import { useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";

export const Tilt = ({
  children,
  maxRotate = 10,
  className = "",
  ...rest
}: {
  children: React.ReactNode;
  maxRotate?: number;
  className?: string;
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const card = cardRef.current;
      if (!card) return;

      const { innerWidth, innerHeight } = window;
      const xPercent = e.clientX / innerWidth; // 0 (left) to 1 (right)
      const yPercent = e.clientY / innerHeight; // 0 (top) to 1 (bottom)

      // Centered at 0, range -0.5 to 0.5
      const xCentered = xPercent - 0.5;
      const yCentered = yPercent - 0.5;

      const rotateY = xCentered * 2 * maxRotate; // left/right
      const rotateX = -yCentered * 2 * maxRotate; // up/down (invert for natural tilt)

      card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
      card.style.zIndex = "10";
    };

    const handleMouseLeave = () => {
      const card = cardRef.current;
      if (!card) return;
      card.style.transform = "perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)";
      card.style.zIndex = "1";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [maxRotate]);

  return (
    <Slot
      ref={cardRef}
      className={twMerge("transition-transform duration-300 ease-out", className)}
      style={{
        willChange: "transform",
      }}
      {...rest}
    >
      {children}
    </Slot>
  );
};
