"use client"

import { cn } from "@/lib/utils"
import { Skull, Coins } from "lucide-react"
import { VoidLogo } from "@/components/ui/void-logo"

interface VoidStatsCardProps {
  totalBets: number
  totalPool: number
  poolUnit?: string
  className?: string
}

export function VoidStatsCard({
  totalBets,
  totalPool,
  poolUnit = "USDC",
  className,
}: VoidStatsCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-void-mid border border-white/20 glow-soft p-6 text-center",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <VoidLogo size="sm" />
        <span className="font-[family-name:var(--font-display)] text-xs text-muted-foreground tracking-widest uppercase">
          THE VOID CONTAINS
        </span>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-3">
          <Skull className="h-5 w-5 text-muted-foreground" />
          <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-foreground text-glow">
            {totalBets.toLocaleString()}
          </span>
          <span className="font-[family-name:var(--font-body)] text-sm text-muted-foreground uppercase">
            BETS
          </span>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Coins className="h-5 w-5 text-white" />
          <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-white text-glow">
            {totalPool.toLocaleString()}
          </span>
          <span className="font-[family-name:var(--font-body)] text-sm text-muted-foreground uppercase">
            {poolUnit}
          </span>
        </div>
      </div>

      {/* Footer */}
      <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground mt-4 uppercase tracking-wide">
        HIDDEN UNTIL RESOLUTION
      </p>
    </div>
  )
}
