"use client"

import { cn } from "@/lib/utils"

interface VoidLogoProps {
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
}

export function VoidLogo({ className, size = "md" }: VoidLogoProps) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
    xl: "h-24 w-24",
  }

  return (
    <div className={cn("relative", sizes[size], className)}>
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-[spin-slow_20s_linear_infinite]" />

      {/* Middle ring */}
      <div
        className="absolute inset-1 rounded-full border border-white/30 animate-[spin-slow_15s_linear_infinite_reverse]"
      />

      {/* Inner void */}
      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-void-mid to-void-deepest" />

      {/* Center glow */}
      <div className="absolute inset-3 rounded-full bg-white/20 blur-sm animate-[void-pulse_2s_ease-in-out_infinite]" />

      {/* Center dot */}
      <div className="absolute inset-[40%] rounded-full bg-white glow" />
    </div>
  )
}
