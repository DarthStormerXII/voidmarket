"use client"

import Image from "next/image"
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

// Map star types to their NASA image paths
const starImages: Record<StarType, string> = {
  "red-giant": "/stars/red-giant.jpeg",
  "blue-supergiant": "/stars/blue-supergiant.jpg",
  "white-dwarf": "/stars/white-dwarf.jpeg",
  "yellow-sun": "/stars/yellow-sun.jpeg",
  "neutron": "/stars/neutron.jpeg",
  "binary": "/stars/binary.jpg",
}

export function StarAvatar({
  starType,
  size = "md",
  className,
  showGlow = true
}: StarAvatarProps) {
  return (
    <div
      className={cn(
        "relative rounded-full flex items-center justify-center overflow-hidden",
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

      {/* Star image */}
      <Image
        src={starImages[starType]}
        alt={STAR_TYPE_NAMES[starType]}
        fill
        className="object-cover rounded-full"
        sizes="(max-width: 96px) 96px"
      />

      {/* Subtle vignette overlay */}
      <div
        className="absolute inset-0 rounded-full opacity-30"
        style={{
          background: `radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)`,
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
