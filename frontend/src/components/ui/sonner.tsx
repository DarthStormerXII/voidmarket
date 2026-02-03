"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-void-mid group-[.toaster]:text-foreground group-[.toaster]:border-void-surface group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg",
          title: "font-[family-name:var(--font-display)] text-sm uppercase tracking-wide",
          description: "font-[family-name:var(--font-body)] text-xs uppercase text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-[family-name:var(--font-display)] uppercase",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-[family-name:var(--font-display)] uppercase",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
