"use client"

import { cn } from "@/lib/utils"
import { StarType, STAR_TYPES } from "@/types"
import { StarAvatar, STAR_TYPE_NAMES } from "@/components/ui/star-avatar"

interface StarSelectorProps {
  selectedStar: StarType | null
  onSelect: (starType: StarType) => void
}

export function StarSelector({ selectedStar, onSelect }: StarSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4 px-4">
      {STAR_TYPES.map((star) => (
        <button
          key={star.id}
          onClick={() => onSelect(star.id)}
          className={cn(
            "flex flex-col items-center p-4 rounded-xl transition-all duration-300",
            "border bg-void-deep",
            selectedStar === star.id
              ? "border-white/50 bg-void-mid shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              : "border-void-surface hover:border-white/30"
          )}
        >
          <StarAvatar starType={star.id} size="lg" showGlow={selectedStar === star.id} />
          <span className="font-[family-name:var(--font-display)] text-xs text-foreground uppercase mt-3 tracking-wider">
            {STAR_TYPE_NAMES[star.id]}
          </span>
          <span className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground text-center mt-1 leading-tight">
            {star.description}
          </span>
        </button>
      ))}
    </div>
  )
}
