"use client"

import { cn } from "@/lib/utils"

interface StorySlideProps {
  title: string
  description: string
  isActive: boolean
}

export function StorySlide({ title, description, isActive }: StorySlideProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center px-8 transition-all duration-500",
        isActive ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full pointer-events-none"
      )}
    >
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground uppercase text-center mb-6 tracking-wider">
        {title}
      </h2>
      <p className="font-[family-name:var(--font-body)] text-sm text-muted-foreground text-center leading-relaxed max-w-xs">
        {description}
      </p>
    </div>
  )
}
