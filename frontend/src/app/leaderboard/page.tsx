"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, Trophy, Sparkles, Target, Zap, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { VoidLogo } from "@/components/ui/void-logo"
import { BottomNav } from "@/components/layout/bottom-nav"
import { useLeaderboard } from "@/hooks/use-leaderboard"
import { cn } from "@/lib/utils"
import { haptics } from "@/lib/haptics"

type LeaderboardTab = "clusters" | "stars" | "bettors"

const tabs: { id: LeaderboardTab; label: string; icon: React.ElementType }[] = [
  { id: "clusters", label: "CLUSTERS", icon: Users },
  { id: "stars", label: "STARS", icon: Sparkles },
  { id: "bettors", label: "BETTORS", icon: Target },
]

function getRankStyle(index: number) {
  if (index === 0) return "bg-white/20 text-white"
  if (index === 1) return "bg-white/10 text-white/80"
  if (index === 2) return "bg-void-surface text-white/60"
  return "bg-void-surface text-muted-foreground"
}

export default function LeaderboardPage() {
  const [selectedTab, setSelectedTab] = useState<LeaderboardTab>("clusters")
  const { entries, isLoading } = useLeaderboard(selectedTab)

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-void-surface">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="p-2 -ml-2" onClick={() => haptics.buttonTap()}>
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-white" />
            <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold uppercase tracking-wider">
              LEADERBOARD
            </h1>
          </div>
          <div className="w-10" />
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 pt-4">
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => {
                  haptics.buttonTap()
                  setSelectedTab(tab.id)
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-[family-name:var(--font-display)] text-xs uppercase tracking-wider transition-all",
                  selectedTab === tab.id
                    ? "bg-white/20 text-white border border-white"
                    : "bg-void-surface text-muted-foreground border border-void-surface hover:border-white/30"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="px-4 pt-6 space-y-2">
        {isLoading ? (
          <div className="text-center py-12">
            <VoidLogo size="md" className="mx-auto mb-3 animate-pulse" />
            <p className="font-[family-name:var(--font-display)] text-sm text-muted-foreground uppercase">
              SCANNING THE VOID...
            </p>
          </div>
        ) : entries.length > 0 ? (
          entries.map((entry, index) => (
            <Card
              key={entry.id || entry.name || index}
              className="bg-void-deep border-void-surface hover:border-white/30 transition-colors"
            >
              <CardContent className="p-3">
                {selectedTab === "clusters" && (
                  <ClustersRow entry={entry} index={index} />
                )}
                {selectedTab === "stars" && (
                  <StarsRow entry={entry} index={index} />
                )}
                {selectedTab === "bettors" && (
                  <BettorsRow entry={entry} index={index} />
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="font-[family-name:var(--font-display)] text-sm text-muted-foreground uppercase">
              NO DATA YET
            </p>
            <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase mt-1">
              THE VOID AWAITS
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ClustersRow({ entry, index }: { entry: any; index: number }) {
  return (
    <div className="flex items-center gap-3">
      {/* Rank */}
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center font-[family-name:var(--font-display)] text-sm font-bold flex-shrink-0",
          getRankStyle(index)
        )}
      >
        {index + 1}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground uppercase truncate">
          {entry.name}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="font-[family-name:var(--font-body)] text-xs text-muted-foreground">
            {entry.memberCount} MEMBERS
          </span>
          <span className="font-[family-name:var(--font-body)] text-xs text-muted-foreground">
            {entry.novasWon}W
          </span>
        </div>
      </div>

      {/* Energy */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Zap className="h-4 w-4 text-white" />
        <span className="font-[family-name:var(--font-display)] text-sm font-bold text-foreground">
          {entry.energy.toLocaleString()}
        </span>
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StarsRow({ entry, index }: { entry: any; index: number }) {
  return (
    <div className="flex items-center gap-3">
      {/* Rank */}
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center font-[family-name:var(--font-display)] text-sm font-bold flex-shrink-0",
          getRankStyle(index)
        )}
      >
        {index + 1}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground uppercase truncate">
          {entry.name}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase">
            {(entry.starType || "unknown").replace("-", " ")}
          </span>
          <span className="font-[family-name:var(--font-body)] text-xs text-muted-foreground">
            {entry.betsWon}W
          </span>
        </div>
      </div>

      {/* Photons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Sparkles className="h-4 w-4 text-white" />
        <span className="font-[family-name:var(--font-display)] text-sm font-bold text-foreground">
          {entry.totalPhotons.toLocaleString()}
        </span>
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BettorsRow({ entry, index }: { entry: any; index: number }) {
  const totalBets = entry.betsWon + entry.betsLost
  const winRate = totalBets > 0 ? Math.round((entry.betsWon / totalBets) * 100) : 0

  return (
    <div className="flex items-center gap-3">
      {/* Rank */}
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center font-[family-name:var(--font-display)] text-sm font-bold flex-shrink-0",
          getRankStyle(index)
        )}
      >
        {index + 1}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground uppercase truncate">
          {entry.name}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="font-[family-name:var(--font-body)] text-xs text-muted-foreground">
            {entry.betsWon}W / {entry.betsLost}L
          </span>
        </div>
      </div>

      {/* Win Rate */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Target className="h-4 w-4 text-white" />
        <span className="font-[family-name:var(--font-display)] text-sm font-bold text-foreground">
          {winRate}%
        </span>
      </div>
    </div>
  )
}
