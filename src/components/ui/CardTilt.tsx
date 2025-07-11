import { Card } from "@/components/ui/card";
import React, { useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";

type CardTiltProps = {
  children: React.ReactNode;
  className?: string;
};

export const CardTilt: React.FC<CardTiltProps> = ({ children, className = "", ...rest }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position within the card
    const y = e.clientY - rect.top; // y position within the card

    // Calculate rotation: max 15deg in each direction
    const rotateX = (y / rect.height - 0.5) * -30; // invert for natural tilt
    const rotateY = (x / rect.width - 0.5) * 30;

    card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
    card.style.zIndex = "10";
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = "perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)";
    card.style.zIndex = "1";
  };

  return (
    <Card
      ref={cardRef}
      className={twMerge("transition-transform duration-300 ease-out", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        willChange: "transform",
      }}
      {...rest}
    >
      {children}
    </Card>
  );
};

type CardTiltWindowProps = {
  children: React.ReactNode;
  className?: string;
};

const MAX_ROTATE = 7; // degrees

export const CardTiltWindow: React.FC<CardTiltWindowProps> = ({ children, className = "", ...rest }) => {
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

      const rotateY = xCentered * 2 * MAX_ROTATE; // left/right
      const rotateX = -yCentered * 2 * MAX_ROTATE; // up/down (invert for natural tilt)

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
  }, []);

  return (
    <Card
      ref={cardRef}
      className={twMerge("transition-transform duration-300 ease-out", className)}
      style={{
        willChange: "transform",
      }}
      {...rest}
    >
      {children}
    </Card>
  );
};
