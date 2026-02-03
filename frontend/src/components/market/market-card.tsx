"use client"

import Link from "next/link"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Skull, Coins, Clock, User } from "lucide-react"
import { Market, CATEGORY_CONFIG } from "@/types"
import { CountdownTimer } from "./countdown-timer"
import { haptics } from "@/lib/haptics"

interface MarketCardProps {
  market: Market
  compact?: boolean
}

export function MarketCard({ market, compact = false }: MarketCardProps) {
  const category = CATEGORY_CONFIG[market.category]

  if (compact) {
    return (
      <Link href={`/markets/${market.id}`} onClick={() => haptics.buttonTap()}>
        <Card variant="interactive" className="w-[156px] h-[160px] flex-shrink-0">
          {/* Gradient header */}
          <div className={cn(
            "h-10 rounded-t-xl bg-gradient-to-r",
            category.gradient
          )} />

          <CardHeader className="p-3 pb-2">
            <Badge variant="outline" className="w-fit text-[10px] px-2 py-0.5">
              {category.label}
            </Badge>
          </CardHeader>

          <CardContent className="p-3 pt-0">
            <p className="font-[family-name:var(--font-display)] text-xs font-semibold text-foreground uppercase leading-tight line-clamp-2 mb-3">
              {market.title}
            </p>

            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <Skull className="h-3 w-3" />
                <span>{market.totalBets}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <CountdownTimer targetDate={market.endDate} compact />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  return (
    <Link href={`/markets/${market.id}`} onClick={() => haptics.buttonTap()}>
      <Card variant="interactive" className="w-full">
        <CardHeader className="pb-2">
          <Badge variant="outline" className="w-fit">
            {category.label}
          </Badge>

          <h3 className="font-[family-name:var(--font-display)] text-base font-semibold text-foreground uppercase leading-tight mt-2">
            {market.title}
          </h3>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="h-px bg-void-surface" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skull className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-[family-name:var(--font-display)] text-lg font-bold text-foreground">
                  {market.totalBets.toLocaleString()}
                </p>
                <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground uppercase">
                  BETS
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-white" />
              <div>
                <p className="font-[family-name:var(--font-display)] text-lg font-bold text-white">
                  {market.totalPool.toLocaleString()}
                </p>
                <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground uppercase">
                  USDC
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span className="uppercase">ENDS: </span>
              <CountdownTimer targetDate={market.endDate} compact />
            </div>

            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span className="uppercase">{market.creatorName || market.creatorAddress.slice(0, 8)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
