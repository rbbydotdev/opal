"use client";

import { PingDot } from "@/components/PingDot";
import React from "react";
import { toast as sonnerToast, Toaster as SonnerToaster } from "sonner";

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

interface ToastProps {
  id: string | number;
  title?: string;
  description?: string | React.ReactNode;
  type?: "default" | "success" | "error" | "warning" | "info";
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastOptions extends Omit<ToastProps, "id"> {
  position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
}

function toast(toastData: ToastOptions) {
  return sonnerToast.custom(
    (id) => (
      <Toast
        id={id}
        title={toastData.title}
        description={toastData.description}
        type={toastData.type || "default"}
        action={toastData.action}
      />
    ),
    {
      position: toastData.position || "top-right",
    }
  );
}

function Toast(props: ToastProps) {
  const { title, description, action, id, type = "default" } = props;

  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return "bg-card border-success";
      case "error":
        return "bg-card border-destructive";
      case "warning":
        return "bg-card border-chart-1";
      case "info":
        return "bg-card border-chart-2";
      default:
        return "bg-card border-accent";
    }
  };

  // Accessibility IDs
  const titleId = `toast-title-${id}`;
  const descId = `toast-desc-${id}`;

  return (
    <div
      className={`flex rounded-lg shadow-lg border w-full max-w-md min-w-[20rem] min-h-16 items-center p-4 ${getTypeStyles()}`}
      // Live region and semantic role for screen readers
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
    >
      <div className="flex flex-1 items-center min-h-0 w-full">
        <div className="w-full flex flex-col justify-center">
          {title && (
            <span id={titleId} className="text-sm font-medium text-foreground leading-tight flex items-center gap-2">
              <PingDot type={type} />
              {title}
            </span>
          )}
          {description && (
            <div id={descId} className="mt-1 text-sm text-muted-foreground leading-tight">
              {description}
            </div>
          )}
        </div>
      </div>
      {action && (
        <div className="ml-4 shrink-0 flex items-center">
          <button
            className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
            onClick={() => {
              action.onClick();
              sonnerToast.dismiss(id);
            }}
            aria-label={action.label}
          >
            {action.label}
          </button>
        </div>
      )}
    </div>
  );
}

const Toaster = ({ ...props }: ToasterProps) => {
  return <SonnerToaster className="toaster group" {...props} />;
};

export { toast, Toaster };
