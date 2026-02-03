"use client"

import { cn } from "@/lib/utils"
import { StarType } from "@/types"

interface StarAvatarProps {
  starType: StarType
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  showGlow?: boolean
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-24 h-24",
}

const glowSizeClasses = {
  sm: "shadow-[0_0_10px_rgba(255,255,255,0.3)]",
  md: "shadow-[0_0_15px_rgba(255,255,255,0.4)]",
  lg: "shadow-[0_0_20px_rgba(255,255,255,0.5)]",
  xl: "shadow-[0_0_30px_rgba(255,255,255,0.6)]",
}

// Star type visual configurations
const starTypeConfig: Record<StarType, {
  gradient: string
  innerGlow: string
  pulseColor: string
}> = {
  "red-giant": {
    gradient: "bg-gradient-radial from-white via-gray-300 to-gray-500",
    innerGlow: "shadow-[inset_0_0_20px_rgba(255,255,255,0.8)]",
    pulseColor: "rgba(255,255,255,0.3)",
  },
  "blue-supergiant": {
    gradient: "bg-gradient-radial from-white via-gray-200 to-gray-400",
    innerGlow: "shadow-[inset_0_0_25px_rgba(255,255,255,0.9)]",
    pulseColor: "rgba(255,255,255,0.4)",
  },
  "white-dwarf": {
    gradient: "bg-gradient-radial from-white via-gray-100 to-gray-300",
    innerGlow: "shadow-[inset_0_0_15px_rgba(255,255,255,1)]",
    pulseColor: "rgba(255,255,255,0.5)",
  },
  "yellow-sun": {
    gradient: "bg-gradient-radial from-white via-gray-200 to-gray-400",
    innerGlow: "shadow-[inset_0_0_18px_rgba(255,255,255,0.85)]",
    pulseColor: "rgba(255,255,255,0.35)",
  },
  "neutron": {
    gradient: "bg-gradient-radial from-white via-gray-300 to-gray-600",
    innerGlow: "shadow-[inset_0_0_30px_rgba(255,255,255,0.95)]",
    pulseColor: "rgba(255,255,255,0.6)",
  },
  "binary": {
    gradient: "bg-gradient-radial from-white via-gray-200 to-gray-500",
    innerGlow: "shadow-[inset_0_0_20px_rgba(255,255,255,0.85)]",
    pulseColor: "rgba(255,255,255,0.4)",
  },
}

export function StarAvatar({
  starType,
  size = "md",
  className,
  showGlow = true
}: StarAvatarProps) {
  const config = starTypeConfig[starType]

  return (
    <div
      className={cn(
        "relative rounded-full flex items-center justify-center",
        sizeClasses[size],
        showGlow && glowSizeClasses[size],
        className
      )}
    >
      {/* Outer glow ring */}
      {showGlow && (
        <div
          className={cn(
            "absolute inset-[-4px] rounded-full opacity-40 animate-pulse",
            "bg-gradient-radial from-white/30 to-transparent"
          )}
          style={{
            animationDuration: "3s",
          }}
        />
      )}

      {/* Main star body */}
      <div
        className={cn(
          "absolute inset-0 rounded-full",
          config.gradient,
          config.innerGlow
        )}
      />

      {/* Binary star overlay - shows two overlapping circles */}
      {starType === "binary" && (
        <>
          <div
            className="absolute w-[45%] h-[45%] rounded-full bg-white/90 top-[20%] left-[15%]"
            style={{
              boxShadow: "inset 0 0 10px rgba(255,255,255,1)",
            }}
          />
          <div
            className="absolute w-[45%] h-[45%] rounded-full bg-white/70 bottom-[20%] right-[15%]"
            style={{
              boxShadow: "inset 0 0 8px rgba(255,255,255,0.9)",
            }}
          />
        </>
      )}

      {/* Neutron star center core */}
      {starType === "neutron" && (
        <div
          className="absolute w-[30%] h-[30%] rounded-full bg-white animate-pulse"
          style={{
            boxShadow: "0 0 15px rgba(255,255,255,1), 0 0 30px rgba(255,255,255,0.5)",
            animationDuration: "1s",
          }}
        />
      )}

      {/* Surface texture overlay */}
      <div
        className="absolute inset-0 rounded-full opacity-20"
        style={{
          background: `radial-gradient(circle at 30% 30%, transparent 0%, rgba(0,0,0,0.3) 100%)`,
        }}
      />
    </div>
  )
}

// Star type display names
export const STAR_TYPE_NAMES: Record<StarType, string> = {
  "red-giant": "RED GIANT",
  "blue-supergiant": "BLUE SUPERGIANT",
  "white-dwarf": "WHITE DWARF",
  "yellow-sun": "YELLOW SUN",
  "neutron": "NEUTRON STAR",
  "binary": "BINARY STAR",
}
