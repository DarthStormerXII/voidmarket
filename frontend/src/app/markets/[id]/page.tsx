"use client"

import { use } from "react"
import Link from "next/link"
import { ChevronLeft, Share2, MoreVertical, User, Calendar, Cpu, FileText, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { VoidStatsCard } from "@/components/market/void-stats-card"
import { CountdownTimer } from "@/components/market/countdown-timer"
import { PlaceBetDrawer } from "@/components/market/place-bet-drawer"
import { BottomNav } from "@/components/layout/bottom-nav"
import { mockMarkets, mockUserBets, mockUserBalance } from "@/lib/mock-data"
import { CATEGORY_CONFIG } from "@/types"
import { haptics } from "@/lib/haptics"
import { cn } from "@/lib/utils"

interface MarketDetailPageProps {
  params: Promise<{ id: string }>
}

export default function MarketDetailPage({ params }: MarketDetailPageProps) {
  const { id } = use(params)
  const market = mockMarkets.find(m => m.id === id)
  const userBet = mockUserBets.find(b => b.marketId === id)

  if (!market) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground uppercase">MARKET NOT FOUND</p>
      </div>
    )
  }

  const category = CATEGORY_CONFIG[market.category]

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-void-surface">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/markets" className="p-2 -ml-2" onClick={() => haptics.buttonTap()}>
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold uppercase tracking-wider">
            MARKET
          </h1>
          <div className="flex items-center gap-1">
            <button className="p-2" onClick={() => haptics.buttonTap()}>
              <Share2 className="h-5 w-5 text-muted-foreground" />
            </button>
            <button className="p-2" onClick={() => haptics.buttonTap()}>
              <MoreVertical className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 pt-6 space-y-6">
        {/* Category Badge */}
        <div className="text-center">
          <Badge variant="outline" className="text-sm">
            {category.label}
          </Badge>
        </div>

        {/* Title */}
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground uppercase text-center leading-tight">
          {market.title}
        </h2>

        {/* Creator Info */}
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span className="uppercase">{market.creatorName || market.creatorAddress.slice(0, 10)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span className="uppercase">{market.createdAt.toLocaleDateString()}</span>
          </div>
        </div>

        <div className="h-px bg-void-surface" />

        {/* Void Stats */}
        <VoidStatsCard
          totalBets={market.totalBets}
          totalPool={market.totalPool}
        />

        {/* Countdown Timer */}
        <CountdownTimer targetDate={market.endDate} />

        {/* Resolution Criteria */}
        <Card className="bg-void-deep border-void-surface">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-[family-name:var(--font-display)] text-xs text-muted-foreground tracking-widest uppercase">
                RESOLUTION CRITERIA
              </span>
            </div>

            <p className="font-[family-name:var(--font-body)] text-sm text-foreground leading-relaxed">
              &ldquo;{market.resolutionCriteria}&rdquo;
            </p>

            <div className="flex items-center gap-2 pt-2">
              <Cpu className="h-4 w-4 text-white/70" />
              <span className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase">
                ORACLE: {market.oracleType === "stork" ? "STORK PRICE FEED" : "MANUAL RESOLUTION"}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="h-px bg-void-surface" />

        {/* User Position (if exists) */}
        {userBet && (
          <Card className={cn(
            "bg-void-deep",
            userBet.status === "in_void" && "border-white/30",
            userBet.status === "claimable" && "border-white/50 glow"
          )}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-white" />
                <span className="font-[family-name:var(--font-display)] text-xs text-muted-foreground tracking-widest uppercase">
                  YOUR POSITION
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase">BET: </span>
                  <span className={cn(
                    "font-[family-name:var(--font-display)] font-semibold",
                    userBet.outcome === "YES" ? "text-white" : "text-white/60"
                  )}>
                    {userBet.outcome}
                  </span>
                </div>
                <div>
                  <span className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase">AMOUNT: </span>
                  <span className="font-[family-name:var(--font-display)] font-semibold text-foreground">
                    {userBet.amount} USDC
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="uppercase">STATUS: IN THE VOID</span>
                <span className="uppercase">PLACED: {userBet.placedAt.toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-20 left-0 right-0 z-30 p-4 bg-background/95 backdrop-blur-lg border-t border-void-surface">
        <PlaceBetDrawer market={market} userBalance={mockUserBalance}>
          <Button variant="default" size="xl" className="w-full">
            PLACE YOUR BET
          </Button>
        </PlaceBetDrawer>
      </div>

      <BottomNav />
    </div>
  )
}
