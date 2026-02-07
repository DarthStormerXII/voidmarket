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
import { StarAvatar, STAR_TYPE_NAMES } from "@/components/ui/star-avatar"
import { BetCard } from "@/components/market/bet-card"
import { VoidLogo } from "@/components/ui/void-logo"
import { BottomNav } from "@/components/layout/bottom-nav"
import { useStar } from "@/hooks/use-star"
import { useUserBets } from "@/hooks/use-user-bets"
import { useWallet } from "@/components/providers/wallet-provider"
import { useClusters } from "@/hooks/use-clusters"
import { toBet, toCluster, getStarTypeFromAddress } from "@/lib/adapters"
import { cn } from "@/lib/utils"
import { haptics } from "@/lib/haptics"
import { BetStatus, StarType } from "@/types"
import { useTelegram } from "@/components/providers/telegram-provider"
import { DepositDrawer } from "@/components/wallet/deposit-drawer"
import { WithdrawDrawer } from "@/components/wallet/withdraw-drawer"

const betFilterTabs: { id: BetStatus | "all"; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "in_void", label: "ACTIVE" },
  { id: "won", label: "WON" },
  { id: "lost", label: "LOST" },
]

export default function StarPage() {
  const [copied, setCopied] = useState(false)
  const [selectedBetFilter, setSelectedBetFilter] = useState<BetStatus | "all">("all")
  const [depositOpen, setDepositOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)

  const { user } = useTelegram()
  const { star, isLoading: starLoading } = useStar()
  const { bets: apiBets, isLoading: betsLoading } = useUserBets()
  const { address, totalBalance, arcBalance, claimBet, pollTransaction, refreshBalance } = useWallet()
  const { clusters: apiClusters } = useClusters()

  // Derive star info from available data
  const starName = star?.name || user?.username?.toUpperCase() || "ANONYMOUS STAR"
  const starType: StarType = star?.starType || (address ? getStarTypeFromAddress(address) : "yellow-sun")
  const photons = star?.totalPhotons || 0
  const starDescription = star?.description

  // Find user's cluster
  const userCluster = star?.clusterId
    ? apiClusters.find(c => c.id === star.clusterId)
    : undefined

  const allBets = apiBets.map(b => toBet(b))

  // Filter bets
  const filteredBets = allBets.filter(bet => {
    if (selectedBetFilter === "all") return true
    if (selectedBetFilter === "in_void") return bet.status === "in_void" || bet.status === "claimable"
    if (selectedBetFilter === "won") return bet.status === "won" || bet.status === "claimable"
    return bet.status === selectedBetFilter
  })

  const displayAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "Loading..."

  const handleCopyAddress = () => {
    if (!address) return
    haptics.buttonTap()
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClaim = async (betId: string) => {
    haptics.success()
    try {
      const { transactionId } = await claimBet(parseInt(betId))
      const result = await pollTransaction(transactionId)
      if (result.status === "CONFIRMED") {
        haptics.success()
        await refreshBalance()
      }
    } catch (err) {
      console.error("Failed to claim:", err)
    }
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
              <StarAvatar starType={starType} size="xl" showGlow />

              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-foreground uppercase mt-4 tracking-wider">
                {starName}
              </h2>

              <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase mt-1">
                {STAR_TYPE_NAMES[starType]}
              </p>

              {starDescription && (
                <p className="font-[family-name:var(--font-body)] text-sm text-muted-foreground text-center mt-3 max-w-xs">
                  {starDescription}
                </p>
              )}

              {/* Address */}
              <div className="flex items-center gap-2 mt-4 p-2 rounded-lg bg-void-surface">
                <span className="font-[family-name:var(--font-mono)] text-xs text-foreground">
                  {displayAddress}
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
                {address && (
                  <a
                    href={`https://explorer-testnet.arc.circle.com/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded hover:bg-void-mid transition-colors"
                  >
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                )}
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-white" />
                  <span className="font-[family-name:var(--font-display)] text-sm font-bold text-foreground">
                    {photons}
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
                          {userCluster.memberCount} MEMBERS
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
            BALANCE
          </h3>

          <Card className="bg-void-deep border-void-surface">
            <CardContent className="p-4">
              <div className="text-center mb-4">
                <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-foreground">
                  {totalBalance.toFixed(2)} USDC
                </p>
                <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase mt-1">
                  ARC TESTNET
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button variant="default" size="lg" onClick={() => { haptics.buttonTap(); setDepositOpen(true) }}>
                  <ArrowDownLeft className="h-4 w-4 mr-2" />
                  DEPOSIT
                </Button>
                <Button variant="outline" size="lg" onClick={() => { haptics.buttonTap(); setWithdrawOpen(true) }}>
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
                {allBets.filter(b => b.status === "won" || b.status === "claimable").length}
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
          {betsLoading ? (
            <div className="text-center py-8">
              <VoidLogo size="md" className="mx-auto mb-3 animate-pulse" />
            </div>
          ) : filteredBets.length > 0 ? (
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

      <DepositDrawer isOpen={depositOpen} onClose={() => setDepositOpen(false)} />
      <WithdrawDrawer isOpen={withdrawOpen} onClose={() => setWithdrawOpen(false)} />

      <BottomNav />
    </div>
  )
}
