"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Settings,
  Copy,
  ExternalLink,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Zap,
  Trophy,
  Sparkles
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StarAvatar, STAR_TYPE_NAMES } from "@/components/ui/star-avatar"
import { BetCard } from "@/components/market/bet-card"
import { BottomNav } from "@/components/layout/bottom-nav"
import {
  mockStar,
  mockUserBets,
  mockChainBalances,
  mockClusters
} from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { haptics } from "@/lib/haptics"
import { BetStatus } from "@/types"

const betFilterTabs: { id: BetStatus | "all"; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "in_void", label: "ACTIVE" },
  { id: "won", label: "WON" },
  { id: "lost", label: "LOST" },
]

export default function StarPage() {
  const [copied, setCopied] = useState(false)
  const [selectedBetFilter, setSelectedBetFilter] = useState<BetStatus | "all">("all")

  // Calculate total balance across chains
  const totalBalance = mockChainBalances.reduce((acc, chain) => acc + chain.balance, 0)

  // Get user's cluster
  const userCluster = mockClusters.find(c => c.id === mockStar.clusterId)

  // Filter bets
  const filteredBets = mockUserBets.filter(bet => {
    if (selectedBetFilter === "all") return true
    if (selectedBetFilter === "in_void") return bet.status === "in_void" || bet.status === "claimable"
    if (selectedBetFilter === "won") return bet.status === "won" || bet.status === "claimable"
    return bet.status === selectedBetFilter
  })

  const handleCopyAddress = () => {
    haptics.buttonTap()
    navigator.clipboard.writeText(mockStar.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClaim = (betId: string) => {
    haptics.success()
    console.log("Claiming bet:", betId)
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-void-surface">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="w-10" />
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold uppercase tracking-wider">
            MY STAR
          </h1>
          <button className="p-2" onClick={() => haptics.buttonTap()}>
            <Settings className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <div className="px-4 pt-6 space-y-6">
        {/* Profile Card */}
        <Card className="bg-void-mid border-primary/20 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col items-center">
              <StarAvatar starType={mockStar.starType} size="xl" showGlow />

              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-foreground uppercase mt-4 tracking-wider">
                {mockStar.name}
              </h2>

              <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase mt-1">
                {STAR_TYPE_NAMES[mockStar.starType]}
              </p>

              {mockStar.bio && (
                <p className="font-[family-name:var(--font-body)] text-sm text-muted-foreground text-center mt-3 max-w-xs">
                  {mockStar.bio}
                </p>
              )}

              {/* Address */}
              <div className="flex items-center gap-2 mt-4 p-2 rounded-lg bg-void-surface">
                <span className="font-[family-name:var(--font-mono)] text-xs text-foreground">
                  {mockStar.address}
                </span>
                <button
                  onClick={handleCopyAddress}
                  className="p-1 rounded hover:bg-void-mid transition-colors"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-white" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
                <a
                  href={`https://etherscan.io/address/${mockStar.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-void-mid transition-colors"
                >
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-white" />
                  <span className="font-[family-name:var(--font-display)] text-sm font-bold text-foreground">
                    {mockStar.totalPhotons}
                  </span>
                  <span className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase">
                    PHOTONS
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cluster Card */}
        {userCluster && (
          <Link href={`/clusters`}>
            <Card className="bg-void-deep border-void-surface hover:border-white/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-void-surface flex items-center justify-center">
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground uppercase">
                        {userCluster.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-[family-name:var(--font-body)] text-xs text-muted-foreground">
                          {userCluster.energy} ENERGY
                        </span>
                        <span className="text-muted-foreground">|</span>
                        <span className="font-[family-name:var(--font-body)] text-xs text-muted-foreground">
                          {userCluster.members.length} MEMBERS
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        <div className="h-px bg-void-surface" />

        {/* Balance Section */}
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-xs text-muted-foreground tracking-widest uppercase mb-3">
            UNIFIED BALANCE
          </h3>

          <Card className="bg-void-deep border-void-surface">
            <CardContent className="p-4">
              <div className="text-center mb-4">
                <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-foreground">
                  {totalBalance.toFixed(2)} USDC
                </p>
                <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase mt-1">
                  ACROSS ALL CHAINS
                </p>
              </div>

              {/* Chain Breakdown */}
              <div className="space-y-2 mb-4">
                {mockChainBalances.map((chain) => (
                  <div
                    key={chain.chainId}
                    className="flex items-center justify-between p-2 rounded-lg bg-void-surface"
                  >
                    <span className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase">
                      {chain.chainName}
                    </span>
                    <span className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground">
                      {chain.balance.toFixed(2)} {chain.symbol}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button variant="default" size="lg" onClick={() => haptics.buttonTap()}>
                  <ArrowDownLeft className="h-4 w-4 mr-2" />
                  DEPOSIT
                </Button>
                <Button variant="outline" size="lg" onClick={() => haptics.buttonTap()}>
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  WITHDRAW
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="h-px bg-void-surface" />

        {/* Bets Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-[family-name:var(--font-display)] text-xs text-muted-foreground tracking-widest uppercase">
              MY BETS
            </h3>
            <div className="flex items-center gap-1">
              <Trophy className="h-4 w-4 text-white" />
              <span className="font-[family-name:var(--font-display)] text-sm font-bold text-foreground">
                {mockUserBets.filter(b => b.status === "won" || b.status === "claimable").length}
              </span>
              <span className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase">
                WON
              </span>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4">
            {betFilterTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  haptics.buttonTap()
                  setSelectedBetFilter(tab.id)
                }}
                className={cn(
                  "flex-shrink-0 px-4 py-2 rounded-lg font-[family-name:var(--font-display)] text-xs uppercase tracking-wider transition-all",
                  selectedBetFilter === tab.id
                    ? "bg-primary/20 text-primary"
                    : "bg-void-surface text-muted-foreground hover:text-secondary-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Bets List */}
          {filteredBets.length > 0 ? (
            <div className="space-y-3">
              {filteredBets.map(bet => (
                <BetCard key={bet.id} bet={bet} onClaim={handleClaim} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="font-[family-name:var(--font-display)] text-sm text-muted-foreground uppercase">
                NO BETS FOUND
              </p>
              <Link href="/markets">
                <button className="mt-3 px-4 py-2 rounded-lg border border-primary text-primary font-[family-name:var(--font-display)] text-xs uppercase tracking-wider hover:bg-primary/10 transition-colors">
                  EXPLORE MARKETS
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
