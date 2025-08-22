"use client"

import React from "react"
import { toast as sonnerToast, Toaster as SonnerToaster } from "sonner"

type ToasterProps = React.ComponentProps<typeof SonnerToaster>

interface ToastProps {
  id: string | number
  title?: string
  description?: string
  type?: "default" | "success" | "error" | "warning" | "info"
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastOptions extends Omit<ToastProps, "id"> {
  position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right"
}

function toast(toastData: ToastOptions) {
  return sonnerToast.custom((id) => (
    <Toast
      id={id}
      title={toastData.title}
      description={toastData.description}
      type={toastData.type || "default"}
      action={toastData.action}
    />
  ), {
    position: toastData.position
  })
}

function Toast(props: ToastProps) {
  const { title, description, action, id, type = "default" } = props

  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return "bg-card border-primary/20"
      case "error":
        return "bg-destructive/10 border-destructive/20"
      case "warning":
        return "bg-card border-secondary/20"
      case "info":
        return "bg-card border-accent/20"
      default:
        return "bg-card border-border"
    }
  }

  return (
    <div className={`flex rounded-lg shadow-lg border w-full max-w-md min-w-[20rem] min-h-[4rem] items-center p-4 ${getTypeStyles()}`}>
      <div className="flex flex-1 items-center min-h-0">
        <div className="w-full flex flex-col justify-center">
          {title && (
            <p className="text-sm font-medium text-foreground leading-tight">{title}</p>
          )}
          {description && (
            <p className="mt-1 text-sm text-muted-foreground leading-tight">{description}</p>
          )}
        </div>
      </div>
      {action && (
        <div className="ml-4 shrink-0 flex items-center">
          <button
            className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
            onClick={() => {
              action.onClick()
              sonnerToast.dismiss(id)
            }}
          >
            {action.label}
          </button>
        </div>
      )}
    </div>
  )
}

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <SonnerToaster
      className="toaster group"
      {...props}
    />
  )
}

export { Toaster, toast }
