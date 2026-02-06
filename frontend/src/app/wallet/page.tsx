"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ChevronLeft,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  ExternalLink,
  Check,
  Coins,
  TrendingUp,
  TrendingDown,
  Loader2
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { VoidLogo } from "@/components/ui/void-logo"
import { BottomNav } from "@/components/layout/bottom-nav"
import { useUserBets } from "@/hooks/use-user-bets"
import { toBet } from "@/lib/adapters"
import { cn } from "@/lib/utils"
import { haptics } from "@/lib/haptics"
import { useWallet } from "@/components/providers/wallet-provider"

export default function WalletPage() {
  const [copied, setCopied] = useState(false)

  // Use real wallet data from WalletProvider
  const { address, totalBalance, arcBalance, isLoading, error } = useWallet()
  const { bets: apiBets, isLoading: betsLoading } = useUserBets()

  const allBets = apiBets.map(b => toBet(b))

  // Format address for display
  const walletAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "Loading..."
  const fullAddress = address || ""

  const handleCopyAddress = () => {
    if (!address) return
    haptics.buttonTap()
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const stats = {
    totalWon: allBets
      .filter(t => t.status === "won" || t.status === "claimable")
      .reduce((acc, t) => acc + (t.payout || 0), 0),
    totalBet: allBets
      .reduce((acc, t) => acc + t.amount, 0),
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
            WALLET
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">
        {/* Balance Card */}
        <Card className="bg-void-mid border-primary/20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-center gap-2 mb-4">
              <VoidLogo size="md" />
            </div>

            <div className="text-center mb-6">
              <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase mb-1">
                AVAILABLE BALANCE
              </p>
              {isLoading ? (
                <div className="flex items-center justify-center h-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : error ? (
                <p className="font-[family-name:var(--font-display)] text-lg font-bold text-red-500">
                  {error}
                </p>
              ) : (
                <p className="font-[family-name:var(--font-display)] text-4xl font-bold text-foreground text-glow">
                  {totalBalance.toFixed(4)}
                </p>
              )}
              <p className="font-[family-name:var(--font-body)] text-sm text-muted-foreground uppercase">
                USDC
              </p>
            </div>

            {/* Wallet Address */}
            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-void-surface">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="font-[family-name:var(--font-mono)] text-sm text-foreground">
                {walletAddress}
              </span>
              <button
                onClick={handleCopyAddress}
                className="p-1 rounded hover:bg-void-mid transition-colors"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-white" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <a
                href={`https://testnet.arcscan.app/address/${fullAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded hover:bg-void-mid transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-4">
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

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-void-deep border-void-surface">
            <CardContent className="p-3 text-center">
              <TrendingUp className="h-5 w-5 text-white mx-auto mb-1" />
              <p className="font-[family-name:var(--font-display)] text-lg font-bold text-white">
                +{stats.totalWon.toFixed(2)}
              </p>
              <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground uppercase">
                TOTAL WON
              </p>
            </CardContent>
          </Card>
          <Card className="bg-void-deep border-void-surface">
            <CardContent className="p-3 text-center">
              <TrendingDown className="h-5 w-5 text-white/60 mx-auto mb-1" />
              <p className="font-[family-name:var(--font-display)] text-lg font-bold text-white/60">
                -{stats.totalBet.toFixed(2)}
              </p>
              <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground uppercase">
                TOTAL BET
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="h-px bg-void-surface" />

        {/* Bet History */}
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-xs text-muted-foreground tracking-widest uppercase mb-3">
            BET HISTORY
          </h3>

          {betsLoading ? (
            <div className="text-center py-12">
              <VoidLogo size="md" className="mx-auto mb-3 animate-pulse" />
              <p className="font-[family-name:var(--font-display)] text-sm text-muted-foreground uppercase">
                LOADING...
              </p>
            </div>
          ) : allBets.length > 0 ? (
            <div className="space-y-2">
              {allBets.map(bet => (
                <Card key={bet.id} className="bg-void-deep border-void-surface hover:border-white/30 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-void-surface flex items-center justify-center">
                        <Coins className="h-4 w-4 text-white/80" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground uppercase truncate">
                            {bet.marketTitle}
                          </p>
                          <p className="font-[family-name:var(--font-display)] text-sm font-bold text-white/60">
                            -{bet.amount} USDC
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase">
                            {bet.placedAt.toLocaleDateString()}
                          </p>
                          <Badge variant="inVoid" className="text-[10px]">
                            {bet.status === "in_void" ? "IN VOID" : bet.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <VoidLogo size="md" className="mx-auto mb-3 opacity-50" />
              <p className="font-[family-name:var(--font-display)] text-sm text-muted-foreground uppercase">
                NO BETS YET
              </p>
              <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase mt-1">
                YOUR HISTORY WILL APPEAR HERE
              </p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
