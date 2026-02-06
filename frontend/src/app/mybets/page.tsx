"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, Trophy, Coins } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { BetCard } from "@/components/market/bet-card"
import { VoidLogo } from "@/components/ui/void-logo"
import { BottomNav } from "@/components/layout/bottom-nav"
import { useUserBets } from "@/hooks/use-user-bets"
import { toBet } from "@/lib/adapters"
import { cn } from "@/lib/utils"
import { BetStatus } from "@/types"
import { haptics } from "@/lib/haptics"

const filterTabs: { id: BetStatus | "all"; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "in_void", label: "ACTIVE" },
  { id: "won", label: "WON" },
  { id: "lost", label: "LOST" },
]

export default function MyBetsPage() {
  const [selectedFilter, setSelectedFilter] = useState<BetStatus | "all">("all")
  const { bets: apiBets, isLoading } = useUserBets()

  const allBets = apiBets.map(b => toBet(b))

  const filteredBets = allBets.filter(bet => {
    if (selectedFilter === "all") return true
    if (selectedFilter === "in_void") return bet.status === "in_void" || bet.status === "claimable"
    if (selectedFilter === "won") return bet.status === "won" || bet.status === "claimable"
    return bet.status === selectedFilter
  })

  const stats = {
    inVoid: allBets.filter(b => b.status === "in_void").length,
    claimable: allBets.filter(b => b.status === "claimable").length,
    resolved: allBets.filter(b => b.status === "won" || b.status === "lost").length,
    totalWon: allBets
      .filter(b => b.status === "won" || b.status === "claimable")
      .reduce((acc, b) => acc + (b.payout || 0), 0),
  }

  const handleClaim = (betId: string) => {
    console.log("Claiming bet:", betId)
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-void-surface">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="p-2 -ml-2" onClick={() => haptics.buttonTap()}>
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold uppercase tracking-wider">
            MY BETS
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">
        {/* Summary Card */}
        <Card className="bg-void-mid border-primary/20">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-void-surface">
                <VoidLogo size="sm" className="mx-auto mb-2" />
                <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-primary">
                  {stats.inVoid + stats.claimable}
                </p>
                <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase">
                  IN VOID
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-void-surface">
                <Trophy className="h-6 w-6 text-white mx-auto mb-2" />
                <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">
                  {stats.resolved}
                </p>
                <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase">
                  RESOLVED
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-white/10 border border-white/30">
              <Coins className="h-5 w-5 text-white" />
              <span className="font-[family-name:var(--font-display)] text-lg font-bold text-white">
                TOTAL WON: {stats.totalWon.toFixed(2)} USDC
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                haptics.buttonTap()
                setSelectedFilter(tab.id)
              }}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-lg font-[family-name:var(--font-display)] text-xs uppercase tracking-wider transition-all",
                selectedFilter === tab.id
                  ? "bg-primary/20 text-primary"
                  : "bg-void-surface text-muted-foreground hover:text-secondary-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="h-px bg-void-surface" />

        {/* Bets List */}
        {isLoading ? (
          <div className="text-center py-12">
            <VoidLogo size="md" className="mx-auto mb-3 animate-pulse" />
            <p className="font-[family-name:var(--font-display)] text-sm text-muted-foreground uppercase">
              SCANNING THE VOID...
            </p>
          </div>
        ) : filteredBets.length > 0 ? (
          <div className="space-y-3">
            {filteredBets.map(bet => (
              <BetCard key={bet.id} bet={bet} onClaim={handleClaim} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <VoidLogo size="md" className="mx-auto mb-3 opacity-50" />
            <p className="font-[family-name:var(--font-display)] text-sm text-muted-foreground uppercase">
              THE VOID AWAITS
            </p>
            <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase mt-1">
              NO BETS FOUND FOR THIS FILTER
            </p>
            <Link href="/markets">
              <button className="mt-4 px-4 py-2 rounded-lg border border-primary text-primary font-[family-name:var(--font-display)] text-xs uppercase tracking-wider hover:bg-primary/10 transition-colors">
                EXPLORE MARKETS →
              </button>
            </Link>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
